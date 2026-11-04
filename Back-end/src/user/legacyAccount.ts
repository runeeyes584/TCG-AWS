import {
  GetCommand,
  QueryCommand,
  ScanCommand,
  TransactWriteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";

/**
 * Moves a player's data from the id they had in the old Cognito user pool (`custom:legacy_sub`) to the id the new
 * pool gave them. Nothing is ever deleted before its copy exists, and every step can run again: a move cut short is
 * finished at the next sign-in.
 */

const profileTable = process.env.USER_PROFILE_TABLE || process.env.USER_TABLE || "UserProfile";
const matchHistoryTable = process.env.MATCH_HISTORY_TABLE || "MatchHistory";

function isTransactionConflict(error: unknown): boolean {
  return (error as { name?: string } | undefined)?.name === "TransactionCanceledException";
}

async function profileExists(userId: string): Promise<boolean> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: profileTable,
    Key: { user_id: userId },
    ProjectionExpression: "user_id",
    ConsistentRead: true
  }));
  return Boolean(result.Item);
}

/**
 * Moves the profile stored under `legacyId` to `userId`, unchanged (stats, decks, leaderboard), and records where it
 * came from in `legacy_user_id`. Returns whether a profile now exists under `userId`.
 */
export async function adoptLegacyProfile(userId: string, legacyId: string): Promise<boolean> {
  if (!legacyId || legacyId === userId) return false;

  const legacy = await dynamoDb.send(new GetCommand({
    TableName: profileTable,
    Key: { user_id: legacyId },
    ConsistentRead: true
  }));
  if (!legacy.Item) return profileExists(userId);

  try {
    await dynamoDb.send(new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: profileTable,
            Item: { ...legacy.Item, user_id: userId, legacy_user_id: legacyId, updated_at: Date.now() },
            ConditionExpression: "attribute_not_exists(user_id)"
          }
        },
        {
          Delete: {
            TableName: profileTable,
            Key: { user_id: legacyId },
            ConditionExpression: "attribute_exists(user_id)"
          }
        }
      ]
    }));
  } catch (error) {
    // Another request of the same player moved it first.
    if (!isTransactionConflict(error)) throw error;
  }
  return profileExists(userId);
}

/** Re-keys the player's own match history: each item is copied to `userId` and removed from `legacyId` at once. */
async function moveOwnMatchHistory(userId: string, legacyId: string): Promise<number> {
  let moved = 0;
  let cursor: Record<string, unknown> | undefined;
  do {
    const page = await dynamoDb.send(new QueryCommand({
      TableName: matchHistoryTable,
      KeyConditionExpression: "user_id = :legacyId",
      ExpressionAttributeValues: { ":legacyId": legacyId },
      ExclusiveStartKey: cursor
    }));
    for (const item of page.Items || []) {
      await dynamoDb.send(new TransactWriteCommand({
        TransactItems: [
          // Putting the same item again is harmless, so a retry after a partial run is safe.
          { Put: { TableName: matchHistoryTable, Item: { ...item, user_id: userId } } },
          { Delete: { TableName: matchHistoryTable, Key: { user_id: legacyId, played_at: item.played_at } } }
        ]
      }));
      moved += 1;
    }
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return moved;
}

/** Points the other players' history at the new id, so the opponent's name still resolves. */
async function moveOpponentReferences(userId: string, legacyId: string): Promise<number> {
  let updated = 0;
  let cursor: Record<string, unknown> | undefined;
  do {
    const page = await dynamoDb.send(new ScanCommand({
      TableName: matchHistoryTable,
      FilterExpression: "opponent_id = :legacyId",
      ProjectionExpression: "user_id, played_at",
      ExpressionAttributeValues: { ":legacyId": legacyId },
      ExclusiveStartKey: cursor
    }));
    for (const item of page.Items || []) {
      try {
        await dynamoDb.send(new UpdateCommand({
          TableName: matchHistoryTable,
          Key: { user_id: item.user_id, played_at: item.played_at },
          UpdateExpression: "SET opponent_id = :userId",
          ConditionExpression: "opponent_id = :legacyId",
          ExpressionAttributeValues: { ":userId": userId, ":legacyId": legacyId }
        }));
        updated += 1;
      } catch (error) {
        if ((error as { name?: string } | undefined)?.name !== "ConditionalCheckFailedException") throw error;
      }
    }
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return updated;
}

/**
 * Moves the match history that still belongs to `legacyId`, then marks the profile so that it is not looked at
 * again. Runs once per player.
 */
export async function moveLegacyMatchHistory(userId: string, legacyId: string): Promise<void> {
  const own = await moveOwnMatchHistory(userId, legacyId);
  const opponent = await moveOpponentReferences(userId, legacyId);
  await dynamoDb.send(new UpdateCommand({
    TableName: profileTable,
    Key: { user_id: userId },
    UpdateExpression: "SET legacy_history_moved_at = :now",
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeValues: { ":now": Date.now() }
  }));
  console.info("LEGACY_ACCOUNT_MOVED", { userId, legacyId, ownMatches: own, opponentReferences: opponent });
}
