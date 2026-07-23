import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import type { GameState, PlayerId } from "../game/types";
import { enqueueMatchResult } from "./matchResultQueue";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const gameLogsTable = process.env.GAME_LOGS_TABLE || "GameLogs";

export interface EndMatchPayload {
  matchId: string;
  reason?: "SURRENDER" | "NEXUS_DESTROYED" | "FORFEIT" | string;
}

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : event.body || {};
  const matchId = body.matchId || event.matchId;
  const reason = body.reason || "SURRENDER";
  if (!matchId) return response(400, { error: "Missing matchId parameter." });

  const endpoint = process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "") ||
    (event.requestContext?.domainName && event.requestContext?.stage
      ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
      : undefined);
  const wsClient = endpoint
    ? new ApiGatewayManagementApiClient({ endpoint, region })
    : undefined;

  try {
    const result = await dynamoDb.send(new GetCommand({
      TableName: gameStateTable,
      Key: { match_id: matchId },
      ConsistentRead: true
    }));
    const match = result.Item as any;
    if (!match) return response(404, { error: "Match not found." });

    const requestingPlayerId: PlayerId | undefined =
      match.player_1?.connection_id === connectionId ? "P1" :
      match.player_2?.connection_id === connectionId ? "P2" : undefined;
    if (match.status !== "FINISHED" && !requestingPlayerId) {
      return response(403, { error: "Unauthorized player." });
    }

    let finalState = match.engine_state as GameState;
    if (match.status !== "FINISHED" && reason === "SURRENDER" && requestingPlayerId) {
      finalState = applyAction(finalState, { type: "SURRENDER", playerId: requestingPlayerId });
    }
    const winnerId = finalState.winnerId;
    if (!winnerId) return response(409, { error: "Match has no winner." });

    if (match.status !== "FINISHED") {
      await dynamoDb.send(new UpdateCommand({
        TableName: gameStateTable,
        Key: { match_id: matchId },
        ConditionExpression: "#status = :active",
        UpdateExpression:
          "SET #status = :finished, engine_state = :state, winner_id = :winner, ended_at = :endedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":active": "IN_PROGRESS",
          ":finished": "FINISHED",
          ":state": finalState,
          ":winner": winnerId,
          ":endedAt": Date.now()
        }
      }));
    }

    const timestamp = Date.now();
    const [, queueResult] = await Promise.allSettled([
      dynamoDb.send(new PutCommand({
        TableName: gameLogsTable,
        Item: {
          match_id: matchId,
          action_sequence: timestamp,
          actor_id: requestingPlayerId || "SYSTEM",
          action_type: "END_MATCH",
          details: { reason, winnerId },
          timestamp
        }
      })),
      enqueueMatchResult({ match, winnerId, reason, endedAt: timestamp })
    ]);
    if (queueResult.status === "rejected") {
      console.error("Could not queue the completed match result:", queueResult.reason);
    }

    if (wsClient) {
      await Promise.allSettled(([
        [match.player_1?.connection_id, "P1"],
        [match.player_2?.connection_id, "P2"]
      ] as Array<[string | undefined, PlayerId]>).map(async ([recipient, playerId]) => {
        if (!recipient) return;
        await wsClient.send(new PostToConnectionCommand({
          ConnectionId: recipient,
          Data: Buffer.from(JSON.stringify({
            event: "match:ended",
            roomCode: matchId,
            winnerId,
            reason,
            state: redactStateForPlayer(finalState, playerId)
          }))
        }));
      }));
    }

    return response(200, { message: "Match ended successfully.", matchId, winnerId, reason });
  } catch (error: any) {
    if (error?.name === "ConditionalCheckFailedException") {
      return response(409, { error: "Match state changed. Please retry." });
    }
    console.error("EndMatch Lambda Error:", error);
    return response(500, { error: error?.message || "Unable to end match." });
  }
};

function response(statusCode: number, body: Record<string, unknown>) {
  return { statusCode, body: JSON.stringify(body) };
}

function redactStateForPlayer(state: GameState, viewerId: PlayerId): GameState {
  const visible = structuredClone(state);
  const opponentId: PlayerId = viewerId === "P1" ? "P2" : "P1";
  visible.players[opponentId].hand = visible.players[opponentId].hand.map((_, index) => ({
    instanceId: `hidden-hand-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));
  visible.players[opponentId].deck = visible.players[opponentId].deck.map((_, index) => ({
    instanceId: `hidden-deck-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));
  return visible;
}
