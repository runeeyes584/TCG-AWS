import { Router } from "express";
import {
  DeleteCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { authenticate } from "../auth/auth.middleware";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import type { GameState, PlayerId } from "../game/types";

const router = Router();
const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const gameLogsTable = process.env.GAME_LOGS_TABLE || "GameLogs";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";

type MatchRecord = {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  created_at?: number;
  expire_at?: number;
  player_1?: { user_id?: string; connection_id?: string; connected?: boolean };
  player_2?: { user_id?: string; connection_id?: string; connected?: boolean } | null;
  engine_state: GameState;
};

function authenticatedUserId(request: any): string | undefined {
  return typeof request.user?.sub === "string" ? request.user.sub : undefined;
}

export async function findPendingMatch(userId: string): Promise<MatchRecord | undefined> {
  let exclusiveStartKey: Record<string, unknown> | undefined;
  const candidates: MatchRecord[] = [];

  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: gameStateTable,
      FilterExpression:
        "(#status = :waiting OR #status = :active) AND " +
        "(player_1.user_id = :userId OR player_2.user_id = :userId)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":waiting": "WAITING",
        ":active": "IN_PROGRESS",
        ":userId": userId
      },
      ExclusiveStartKey: exclusiveStartKey,
      ConsistentRead: true
    }));

    candidates.push(...((result.Items || []) as MatchRecord[]));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  const nowSeconds = Math.floor(Date.now() / 1_000);
  return candidates
    .filter((match) => {
      if (match.expire_at && match.expire_at <= nowSeconds) return false;
      // An active match must have two authenticated players. This excludes a
      // malformed/stale room record from being presented as resumable.
      return match.status !== "IN_PROGRESS" || Boolean(
        match.player_1?.user_id && match.player_2?.user_id
      );
    })
    .sort((left, right) => {
      const leftPriority = left.status === "IN_PROGRESS" ? 1 : 0;
      const rightPriority = right.status === "IN_PROGRESS" ? 1 : 0;
      if (leftPriority !== rightPriority) return rightPriority - leftPriority;
      return Number(right.created_at ?? 0) - Number(left.created_at ?? 0);
    })[0];
}

async function findWaitingMatchOwnedBy(userId: string): Promise<MatchRecord | undefined> {
  let exclusiveStartKey: Record<string, unknown> | undefined;
  const candidates: MatchRecord[] = [];
  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: gameStateTable,
      FilterExpression: "#status = :waiting AND player_1.user_id = :userId",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":waiting": "WAITING", ":userId": userId },
      ExclusiveStartKey: exclusiveStartKey,
      ConsistentRead: true
    }));
    candidates.push(...((result.Items || []) as MatchRecord[]));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  const nowSeconds = Math.floor(Date.now() / 1_000);
  return candidates
    .filter((match) => !match.expire_at || match.expire_at > nowSeconds)
    .sort((left, right) => Number(right.created_at ?? 0) - Number(left.created_at ?? 0))[0];
}

function redactStateForPlayer(state: GameState, viewerId: PlayerId): GameState {
  const visibleState = structuredClone(state);
  const opponentId: PlayerId = viewerId === "P1" ? "P2" : "P1";
  const opponent = visibleState.players[opponentId];

  opponent.hand = opponent.hand.map((_, index) => ({
    instanceId: `hidden-hand-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));
  opponent.deck = opponent.deck.map((_, index) => ({
    instanceId: `hidden-deck-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));

  return visibleState;
}

async function removeConnectionMatch(connectionId?: string) {
  if (!connectionId) return;
  await dynamoDb.send(new UpdateCommand({
    TableName: connectionsTable,
    Key: { connection_id: connectionId },
    UpdateExpression: "REMOVE match_id"
  }));
}

router.get("/pending", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const match = await findPendingMatch(userId);
    const playerId: PlayerId | undefined = match?.player_1?.user_id === userId
      ? "P1"
      : match?.player_2?.user_id === userId ? "P2" : undefined;
    const opponent = playerId === "P1" ? match?.player_2 : match?.player_1;
    return res.json({
      success: true,
      match: match && playerId ? {
        roomCode: match.match_id,
        status: match.status,
        playerId,
        opponentConnected: opponent?.connected !== false
      } : null
    });
  } catch (error) {
    console.error("GET /matches/pending failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load pending match." });
  }
});

/** Removes only a WAITING room/queue entry. Active games must use surrender. */
router.post("/pending/cancel", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const match = await findWaitingMatchOwnedBy(userId);
    if (!match) {
      return res.status(404).json({ success: false, message: "No waiting room was found." });
    }
    await dynamoDb.send(new DeleteCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      ConditionExpression: "#status = :waiting AND player_1.user_id = :userId",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":waiting": "WAITING", ":userId": userId }
    }));
    await removeConnectionMatch(match.player_1?.connection_id);
    return res.json({ success: true, message: "Waiting room cancelled." });
  } catch (error: any) {
    if (error?.name === "ConditionalCheckFailedException") {
      return res.status(409).json({ success: false, message: "The room changed. Please retry." });
    }
    console.error("POST /matches/pending/cancel failed:", error);
    return res.status(500).json({ success: false, message: "Unable to cancel the waiting room." });
  }
});

router.post("/pending/forfeit", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const match = await findPendingMatch(userId);
    if (!match) {
      return res.status(404).json({ success: false, message: "No pending match was found." });
    }

    const requestingPlayerId: PlayerId | undefined =
      match.player_1?.user_id === userId ? "P1" :
      match.player_2?.user_id === userId ? "P2" : undefined;
    if (!requestingPlayerId) {
      return res.status(403).json({ success: false, message: "You are not a player in this match." });
    }

    if (match.status === "WAITING") {
      await dynamoDb.send(new DeleteCommand({
        TableName: gameStateTable,
        Key: { match_id: match.match_id },
        ConditionExpression: "#status = :waiting AND player_1.user_id = :userId",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":waiting": "WAITING", ":userId": userId }
      }));
      await removeConnectionMatch(match.player_1?.connection_id);
      return res.json({ success: true, message: "Matchmaking cancelled." });
    }

    const finalState = applyAction(match.engine_state, {
      type: "SURRENDER",
      playerId: requestingPlayerId
    });
    const winnerId = finalState.winnerId || (requestingPlayerId === "P1" ? "P2" : "P1");

    await dynamoDb.send(new UpdateCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      ConditionExpression: "#status = :active",
      UpdateExpression: "SET #status = :finished, engine_state = :state, winner_id = :winner",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":active": "IN_PROGRESS",
        ":finished": "FINISHED",
        ":state": finalState,
        ":winner": winnerId
      }
    }));

    await dynamoDb.send(new PutCommand({
      TableName: gameLogsTable,
      Item: {
        match_id: match.match_id,
        action_sequence: Date.now(),
        actor_id: requestingPlayerId,
        action_type: "END_MATCH",
        details: { reason: "FORFEIT", winnerId },
        timestamp: Date.now()
      }
    }));

    await Promise.allSettled([
      removeConnectionMatch(match.player_1?.connection_id),
      removeConnectionMatch(match.player_2?.connection_id)
    ]);

    const managementEndpoint = process.env.WS_MANAGEMENT_ENDPOINT;
    if (managementEndpoint) {
      const wsClient = new ApiGatewayManagementApiClient({ endpoint: managementEndpoint, region });
      await Promise.allSettled((["P1", "P2"] as PlayerId[]).map(async (playerId) => {
        const connectionId = playerId === "P1"
          ? match.player_1?.connection_id
          : match.player_2?.connection_id;
        if (!connectionId) return;
        await wsClient.send(new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({
            event: "match:ended",
            roomCode: match.match_id,
            winnerId,
            reason: "FORFEIT",
            state: redactStateForPlayer(finalState, playerId)
          }))
        }));
      }));
    }

    const queueUrl = process.env.SQS_MATCH_RESULTS_QUEUE_URL;
    if (queueUrl && match.player_1?.user_id && match.player_2?.user_id) {
      const sqs = new SQSClient({ region });
      await sqs.send(new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify({
          matchId: match.match_id,
          winnerId,
          reason: "FORFEIT",
          endedAt: Date.now(),
          player1: { userId: match.player_1.user_id },
          player2: { userId: match.player_2.user_id }
        })
      }));
    }

    return res.json({ success: true, message: "Match forfeited.", winnerId });
  } catch (error: any) {
    if (error?.name === "ConditionalCheckFailedException") {
      return res.status(409).json({ success: false, message: "Match state changed. Please retry." });
    }
    console.error("POST /matches/pending/forfeit failed:", error);
    return res.status(500).json({ success: false, message: "Unable to forfeit match." });
  }
});

export default router;
