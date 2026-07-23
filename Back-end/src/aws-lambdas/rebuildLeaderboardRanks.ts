import type { ScheduledEvent } from "aws-lambda";
import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import {
  buildLeaderboardProjection,
  compareProfiles,
  GLOBAL_LEADERBOARD_SCOPE
} from "../leaderboard/leaderboard";
import { notifyConnections } from "../leaderboard/realtime";

const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";

export interface RebuildLeaderboardInput {
  action?: "rebuild-global-ranks";
  scope?: typeof GLOBAL_LEADERBOARD_SCOPE;
  reason?: string;
}

export interface RebuildLeaderboardResult {
  scope: typeof GLOBAL_LEADERBOARD_SCOPE;
  rebuiltAt: number;
  version: string;
  playersScanned: number;
  playersUpdated: number;
  playersSkipped: number;
  rankChanges: number;
  notificationsAttempted: number;
}

function configuredConcurrency(): number {
  const value = Number(process.env.RANK_REBUILD_CONCURRENCY || 10);
  return Number.isInteger(value) ? Math.min(Math.max(value, 1), 25) : 10;
}

async function scanProfiles(): Promise<Record<string, any>[]> {
  const profiles: Record<string, any>[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: userProfileTable,
      ProjectionExpression:
        "user_id, username, avatar_url, avatar, #stats, #rank, rank_updated_at, " +
        "leaderboard_projected_at, updated_at",
      ExpressionAttributeNames: { "#stats": "stats", "#rank": "rank" },
      ExclusiveStartKey: cursor
    }));
    profiles.push(...(result.Items || []).filter(
      (item) => typeof item.user_id === "string" && !item.user_id.startsWith("__SYSTEM__")
    ));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return profiles;
}

async function scanConnections(): Promise<Record<string, any>[]> {
  const connections: Record<string, any>[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: connectionsTable,
      ProjectionExpression: "connection_id, user_id",
      ExclusiveStartKey: cursor
    }));
    connections.push(...(result.Items || []));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return connections;
}

async function updateRank(
  profile: Record<string, any>,
  rank: number,
  rebuiltAt: number
): Promise<"UPDATED" | "SKIPPED"> {
  const projection = buildLeaderboardProjection(profile, rebuiltAt);
  const hasUpdatedAt = profile.updated_at !== undefined;
  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: userProfileTable,
      Key: { user_id: profile.user_id },
      UpdateExpression:
        "SET #rank = :rank, rank_updated_at = :rebuiltAt, " +
        "leaderboard_scope = :scope, leaderboard_sort = :sort, " +
        "leaderboard_elo = :elo, leaderboard_win_rate = :winRate, " +
        "leaderboard_wins = :wins, leaderboard_losses = :losses, " +
        "leaderboard_projected_at = :rebuiltAt",
      ConditionExpression: hasUpdatedAt
        ? "updated_at = :expectedUpdatedAt"
        : "attribute_not_exists(updated_at)",
      ExpressionAttributeNames: { "#rank": "rank" },
      ExpressionAttributeValues: {
        ":rank": rank,
        ":rebuiltAt": rebuiltAt,
        ":scope": projection.leaderboard_scope,
        ":sort": projection.leaderboard_sort,
        ":elo": projection.leaderboard_elo,
        ":winRate": projection.leaderboard_win_rate,
        ":wins": projection.leaderboard_wins,
        ":losses": projection.leaderboard_losses,
        ...(hasUpdatedAt ? { ":expectedUpdatedAt": profile.updated_at } : {})
      }
    }));
    return "UPDATED";
  } catch (error: any) {
    // A match or profile write won the race. Preserve its newer projection;
    // the next scheduled rebuild will rank that fresh value.
    if (error?.name === "ConditionalCheckFailedException") return "SKIPPED";
    throw error;
  }
}

async function inBatches<T>(
  items: T[],
  size: number,
  operation: (item: T, index: number) => Promise<void>
): Promise<void> {
  for (let start = 0; start < items.length; start += size) {
    const batch = items.slice(start, start + size);
    await Promise.all(batch.map((item, offset) => operation(item, start + offset)));
  }
}

export async function rebuildLeaderboardRanks(
  _event: RebuildLeaderboardInput | ScheduledEvent
): Promise<RebuildLeaderboardResult> {
  const rebuiltAt = Date.now();
  const version = new Date(rebuiltAt).toISOString();
  const profiles = (await scanProfiles()).sort(compareProfiles);
  const previousRanks = new Map<string, number | undefined>(
    profiles.map((profile) => [
      String(profile.user_id),
      Number.isInteger(Number(profile.rank)) ? Number(profile.rank) : undefined
    ])
  );
  const appliedRanks = new Map<string, number>();
  let playersUpdated = 0;
  let playersSkipped = 0;

  await inBatches(profiles, configuredConcurrency(), async (profile, index) => {
    const rank = index + 1;
    const status = await updateRank(profile, rank, rebuiltAt);
    if (status === "UPDATED") {
      playersUpdated += 1;
      appliedRanks.set(String(profile.user_id), rank);
    } else {
      playersSkipped += 1;
    }
  });

  const changedRanks = new Map(
    [...appliedRanks].filter(([userId, rank]) => previousRanks.get(userId) !== rank)
  );
  let notificationsAttempted = 0;
  if (changedRanks.size && process.env.WS_MANAGEMENT_ENDPOINT) {
    const connections = await scanConnections();
    const notifications = connections.flatMap((connection) => {
      const userId = String(connection.user_id || "");
      const rank = changedRanks.get(userId);
      if (!rank || typeof connection.connection_id !== "string") return [];
      return [{
        connectionId: connection.connection_id,
        payload: {
          event: "rank:changed" as const,
          userId,
          rank,
          previousRank: previousRanks.get(userId) ?? null,
          scope: GLOBAL_LEADERBOARD_SCOPE,
          version,
          rebuiltAt
        }
      }];
    });
    notificationsAttempted = notifications.length;
    await inBatches(notifications, 50, async (notification) => {
      await notifyConnections([notification]);
    });
  }

  const result: RebuildLeaderboardResult = {
    scope: GLOBAL_LEADERBOARD_SCOPE,
    rebuiltAt,
    version,
    playersScanned: profiles.length,
    playersUpdated,
    playersSkipped,
    rankChanges: changedRanks.size,
    notificationsAttempted
  };
  console.info("Leaderboard rebuild completed.", result);
  return result;
}

export const handler = rebuildLeaderboardRanks;

