import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import type { GameAction, GameState, PlayerId } from "../game/types";
import { enqueueTurnTimeout } from "./turnTimeoutQueue";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const gameLogsTable = process.env.GAME_LOGS_TABLE || "GameLogs";

type MatchRecord = {
  match_id: string;
  status: "IN_PROGRESS" | "FINISHED";
  state_version?: number;
  engine_state: GameState;
  player_1?: { connection_id?: string; connected?: boolean };
  player_2?: { connection_id?: string; connected?: boolean };
};

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

export function turnHasExpired(state: GameState, now = Date.now()): boolean {
  return state.started &&
    !state.winnerId &&
    Number.isFinite(state.turnStartTime) &&
    Number.isFinite(state.turnDuration) &&
    state.turnDuration > 0 &&
    now >= state.turnStartTime + state.turnDuration;
}

export const handler = async (event: any) => {
  try {
    const connectionId = event.requestContext?.connectionId as string | undefined;
    const domainName = event.requestContext?.domainName as string | undefined;
    const stage = event.requestContext?.stage as string | undefined;
    if (!connectionId || !domainName || !stage) {
      return { statusCode: 400, body: "Missing WebSocket request context." };
    }

    const callbackUrl = process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "") ||
      `https://${domainName}/${stage}`;
    const wsClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region });
    const body = typeof event.body === "string"
      ? JSON.parse(event.body || "{}")
      : (event.body || {});
    const { matchId, action } = body as { matchId?: string; action?: GameAction };

    if (!matchId || !action || typeof action.type !== "string") {
      return { statusCode: 400, body: "Missing matchId or action." };
    }

    const response = await dynamoDb.send(new GetCommand({
      TableName: gameStateTable,
      Key: { match_id: matchId },
      ConsistentRead: true
    }));
    const match = response.Item as MatchRecord | undefined;

    if (!match || match.status !== "IN_PROGRESS") {
      await sendError(wsClient, connectionId, "Match not found or not active.");
      return { statusCode: 404, body: "Match not found." };
    }

    const senderPlayerId: PlayerId | undefined =
      match.player_1?.connection_id === connectionId ? "P1" :
      match.player_2?.connection_id === connectionId ? "P2" :
      undefined;
    if (!senderPlayerId) {
      await sendError(wsClient, connectionId, "Unauthorized player.");
      return { statusCode: 403, body: "Unauthorized." };
    }

    if ("playerId" in action && action.playerId !== senderPlayerId) {
      await sendError(wsClient, connectionId, "Action player does not match this connection.");
      return { statusCode: 403, body: "Action player mismatch." };
    }

    if (action.type === "TIME_OUT") {
      await sendError(wsClient, connectionId, "Timeouts are processed by the server.");
      return { statusCode: 400, body: "TIME_OUT is a server-only action." };
    }

    // A late action must not overwrite the timeout transition. Surrender is
    // intentionally still accepted after the clock expires.
    if (action.type !== "SURRENDER" && turnHasExpired(match.engine_state)) {
      await sendError(wsClient, connectionId, "Turn has already timed out.");
      return { statusCode: 409, body: "Turn has already timed out." };
    }

    let nextState: GameState;
    try {
      nextState = applyAction(match.engine_state, action);
    } catch (error: any) {
      await sendError(wsClient, connectionId, error?.message || "Invalid game action.");
      return { statusCode: 400, body: error?.message || "Invalid game action." };
    }

    const finished = Boolean(nextState.winnerId);
    const currentVersion = match.state_version ?? 0;
    const nextVersion = currentVersion + 1;

    // Register the next deadline before committing the state. If this send
    // succeeds but the conditional write loses a race, the message is harmless
    // because its state token will not match the authoritative DynamoDB item.
    await enqueueTurnTimeout({
      matchId,
      state: nextState,
      stateVersion: nextVersion
    });

    try {
      await dynamoDb.send(new UpdateCommand({
        TableName: gameStateTable,
        Key: { match_id: matchId },
        ConditionExpression:
          "#status = :active AND (attribute_not_exists(state_version) OR state_version = :version) " +
          "AND engine_state.turnStartTime = :turnStart " +
          "AND engine_state.turnDuration = :turnDuration " +
          "AND engine_state.priorityPlayerId = :priorityPlayerId",
        UpdateExpression:
          "SET engine_state = :state, #status = :status, current_round = :round, " +
          "turn_player_id = :nextPlayerId, state_version = :nextVersion",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":active": "IN_PROGRESS",
          ":version": currentVersion,
          ":nextVersion": nextVersion,
          ":turnStart": match.engine_state.turnStartTime,
          ":turnDuration": match.engine_state.turnDuration,
          ":priorityPlayerId": match.engine_state.priorityPlayerId,
          ":state": nextState,
          ":status": finished ? "FINISHED" : "IN_PROGRESS",
          ":round": nextState.round,
          ":nextPlayerId": nextState.priorityPlayerId
        }
      }));
    } catch (error: any) {
      if (error?.name !== "ConditionalCheckFailedException") throw error;
      await sendError(wsClient, connectionId, "Game state changed. Please use the latest state.");
      return { statusCode: 409, body: "Game state changed." };
    }

    await writeActionLog(matchId, senderPlayerId, action);
    await publishState(wsClient, match, nextState);
    return { statusCode: 200, body: "Success." };
  } catch (error: any) {
    console.error("ProcessGameEngine Error:", error);
    return { statusCode: 500, body: error?.message || "Unable to process game action." };
  }
};

async function writeActionLog(
  matchId: string,
  actorId: PlayerId,
  action: GameAction
): Promise<void> {
  const timestamp = Date.now();
  try {
    await dynamoDb.send(new PutCommand({
      TableName: gameLogsTable,
      Item: {
        match_id: matchId,
        action_sequence: timestamp,
        actor_id: actorId,
        action_type: action.type,
        details: action,
        timestamp
      }
    }));
  } catch (error) {
    // State is already committed, so logging cannot make the action fail.
    console.error("Could not write game action log:", error);
  }
}

async function publishState(
  client: ApiGatewayManagementApiClient,
  match: MatchRecord,
  state: GameState
): Promise<void> {
  const recipients: Array<[string | undefined, PlayerId, boolean]> = [
    [match.player_1?.connection_id, "P1", match.player_2?.connected !== false],
    [match.player_2?.connection_id, "P2", match.player_1?.connected !== false]
  ];

  await Promise.all(recipients.map(async ([connectionId, playerId, opponentConnected]) => {
    if (!connectionId) return;
    try {
      await client.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({
          event: "room:update",
          roomCode: match.match_id,
          playerId,
          opponentConnected,
          state: redactStateForPlayer(state, playerId)
        }))
      }));
    } catch (error) {
      if (!isGone(error)) console.error("Could not publish game state:", error);
    }
  }));
}

async function sendError(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  message: string
): Promise<void> {
  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify({ event: "game:error", message }))
    }));
  } catch (error) {
    if (!isGone(error)) console.error("Failed to send game error:", error);
  }
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
