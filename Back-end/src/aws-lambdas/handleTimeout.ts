import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import type { GameState, PlayerId } from "../game/types";
import { actionIsTooLate, turnDeadline } from "../game/rules/turnClock";
import {
  cancelTurnTimeout,
  scheduleTurnTimeout,
  type TurnTimeoutMessage
} from "./turnTimeoutScheduler";
import { enqueueMatchResult } from "./matchResultQueue";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const gameLogsTable = process.env.GAME_LOGS_TABLE || "GameLogs";

export type MatchRecord = {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  state_version?: number;
  engine_state: GameState;
  player_1?: MatchPlayerRecord;
  player_2?: MatchPlayerRecord;
};

type MatchPlayerRecord = {
  user_id?: string;
  connection_id?: string;
  connected?: boolean;
};

function managementEndpoint(): string | undefined {
  return process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "");
}

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

function isPlayerId(value: unknown): value is PlayerId {
  return value === "P1" || value === "P2";
}

export function normalizeTurnTimeoutMessage(event: any): TurnTimeoutMessage {
  let payload = event;
  if (typeof event === "string") {
    try {
      payload = JSON.parse(event);
    } catch {
      throw new Error("Invalid string payload for turn timeout.");
    }
  } else if (event?.detail && typeof event.detail === "object") {
    payload = event.detail;
  }

  if (
    typeof payload?.matchId !== "string" ||
    !payload.matchId ||
    !Number.isInteger(payload.stateVersion) ||
    Number(payload.stateVersion) < 0 ||
    !isPlayerId(payload.expectedPlayerId) ||
    !Number.isFinite(payload.turnStartTime) ||
    !Number.isFinite(payload.turnDuration) ||
    Number(payload.turnDuration) <= 0 ||
    !Number.isFinite(payload.deadline)
  ) {
    throw new Error(`Invalid turn-timeout payload: ${JSON.stringify(event)}`);
  }

  return payload as TurnTimeoutMessage;
}

/**
 * The server's own clock ends a turn only once actions are no longer accepted, so it never takes a turn from a
 * late click that `processGameEngine` would still have played.
 */
export function duePlayer(match: MatchRecord, now = Date.now()): PlayerId | undefined {
  return match.status === "IN_PROGRESS" && actionIsTooLate(match.engine_state, now)
    ? match.engine_state.priorityPlayerId
    : undefined;
}

export function timeoutMessageMatches(
  match: MatchRecord,
  message: TurnTimeoutMessage
): boolean {
  const state = match.engine_state;
  return match.status === "IN_PROGRESS" &&
    !state.winnerId &&
    (match.state_version ?? 0) === message.stateVersion &&
    state.priorityPlayerId === message.expectedPlayerId &&
    state.turnStartTime === message.turnStartTime &&
    state.turnDuration === message.turnDuration &&
    turnDeadline(state) === message.deadline;
}

function redactStateForPlayer(state: GameState, viewerId: PlayerId): GameState {
  const visible = structuredClone(state);
  const opponentId: PlayerId = viewerId === "P1" ? "P2" : "P1";
  const opponent = visible.players[opponentId];

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
  return visible;
}

async function publishState(match: MatchRecord, state: GameState): Promise<void> {
  const endpoint = managementEndpoint();
  if (!endpoint) {
    console.error("Timeout committed without WS_MANAGEMENT_ENDPOINT; clients were not notified.");
    return;
  }

  const client = new ApiGatewayManagementApiClient({ endpoint, region });
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
          serverTime: Date.now(),
          state: redactStateForPlayer(state, playerId)
        }))
      }));
    } catch (error) {
      if (!isGone(error)) console.error("Could not publish timeout state:", error);
    }
  }));
}

async function writeTimeoutLog(
  matchId: string,
  playerId: PlayerId,
  state: GameState
): Promise<void> {
  const timestamp = Date.now();
  try {
    await dynamoDb.send(new PutCommand({
      TableName: gameLogsTable,
      Item: {
        match_id: matchId,
        action_sequence: timestamp,
        actor_id: playerId,
        action_type: "TIME_OUT",
        details: {
          playerId,
          round: state.round,
          afkCount: state.players[playerId].consecutiveAfkCount
        },
        timestamp
      }
    }));
  } catch (error) {
    // The timeout transition is authoritative even if audit logging is down.
    console.error("Could not write timeout log:", error);
  }
}

async function loadMatch(matchId: string): Promise<MatchRecord | undefined> {
  const response = await dynamoDb.send(new GetCommand({
    TableName: gameStateTable,
    Key: { match_id: matchId },
    ConsistentRead: true
  }));
  return response.Item as MatchRecord | undefined;
}

/**
 * Points the match's one schedule at the turn that is really running (the stored state), whatever the schedule that
 * has just fired said. It keeps the safety net of a match whose schedule came late, early, or out of order.
 */
async function rearm(match: MatchRecord): Promise<void> {
  await scheduleTurnTimeout({
    matchId: match.match_id,
    state: match.engine_state,
    stateVersion: match.state_version ?? 0
  });
}

export async function processTimeout(message: TurnTimeoutMessage): Promise<void> {
  const match = await loadMatch(message.matchId);

  // A match that is gone or over needs no safety net: the schedule it left behind is cleaned up.
  if (!match || match.status !== "IN_PROGRESS" || match.engine_state?.winnerId) {
    await cancelTurnTimeout(message.matchId);
    return;
  }

  // The turn has moved on since this schedule was set (it ran early, or two updates arrived out of order), or it
  // has not run out after all (clock skew): the match is still being played, so it is set again for the real turn.
  const playerId = timeoutMessageMatches(match, message) ? duePlayer(match) : undefined;
  if (!playerId) {
    await rearm(match);
    return;
  }

  const originalState = match.engine_state;
  const nextState = applyAction(originalState, { type: "TIME_OUT", playerId });
  const finished = Boolean(nextState.winnerId);
  const endReason = nextState.endReason ?? "UNKNOWN_LEGACY";
  const currentVersion = match.state_version ?? 0;
  const nextVersion = currentVersion + 1;

  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      ConditionExpression:
        "#status = :active AND (attribute_not_exists(state_version) OR state_version = :version) " +
        "AND engine_state.turnStartTime = :turnStart " +
        "AND engine_state.turnDuration = :turnDuration " +
        "AND engine_state.priorityPlayerId = :playerId",
      UpdateExpression:
        "SET engine_state = :state, #status = :status, current_round = :round, " +
        "turn_player_id = :nextPlayerId, state_version = :nextVersion" +
        (finished ? ", winner_id = :winnerId, end_reason = :endReason, ended_at = :endedAt" : ""),
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":active": "IN_PROGRESS",
        ":version": currentVersion,
        ":nextVersion": nextVersion,
        ":turnStart": originalState.turnStartTime,
        ":turnDuration": originalState.turnDuration,
        ":playerId": playerId,
        ":state": nextState,
        ":status": finished ? "FINISHED" : "IN_PROGRESS",
        ":round": nextState.round,
        ":nextPlayerId": nextState.priorityPlayerId,
        ...(finished
          ? {
              ":winnerId": nextState.winnerId,
              ":endReason": endReason,
              ":endedAt": Date.now()
            }
          : {})
      }
    }));
  } catch (error: any) {
    // Somebody else moved the turn on first (a player's report), and they set the schedule for what came next.
    if (error?.name === "ConditionalCheckFailedException") return;
    throw error;
  }

  await publishState(match, nextState);
  // The safety net of the next turn is set only now that this one is committed. It is already logged when it fails.
  const turnTimeout = (finished
    ? cancelTurnTimeout(match.match_id)
    : scheduleTurnTimeout({
        matchId: match.match_id,
        state: nextState,
        stateVersion: nextVersion
      })
  ).catch(() => undefined);
  const resultScheduling = nextState.winnerId
    ? enqueueMatchResult({
        match,
        winnerId: nextState.winnerId,
        reason: endReason
      })
    : Promise.resolve(false);

  const results = await Promise.allSettled([
    writeTimeoutLog(match.match_id, playerId, nextState),
    turnTimeout,
    resultScheduling
  ]);
  if (results[2].status === "rejected") {
    console.error("Could not queue the timed-out match result:", results[2].reason);
  }
}

export const handler = async (event: any): Promise<{ statusCode: number; body?: string }> => {
  try {
    const message = normalizeTurnTimeoutMessage(event);
    await processTimeout(message);
    return { statusCode: 200, body: "Success." };
  } catch (error: any) {
    console.error("Turn-timeout invocation failed:", { event, error });
    return { statusCode: 400, body: error?.message || "Turn-timeout failed." };
  }
};
