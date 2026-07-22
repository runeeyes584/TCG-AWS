import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import type { GameState, PlayerId } from "../game/types";
import {
  enqueueTurnTimeout,
  type TurnTimeoutMessage
} from "./turnTimeoutQueue";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const gameLogsTable = process.env.GAME_LOGS_TABLE || "GameLogs";

export type MatchRecord = {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  state_version?: number;
  engine_state: GameState;
  player_1?: { connection_id?: string; connected?: boolean };
  player_2?: { connection_id?: string; connected?: boolean };
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

export function parseTurnTimeoutMessage(record: SQSRecord): TurnTimeoutMessage {
  const message = JSON.parse(record.body) as Partial<TurnTimeoutMessage>;
  if (
    typeof message.matchId !== "string" ||
    !message.matchId ||
    !Number.isInteger(message.stateVersion) ||
    Number(message.stateVersion) < 0 ||
    !isPlayerId(message.expectedPlayerId) ||
    !Number.isFinite(message.turnStartTime) ||
    !Number.isFinite(message.turnDuration) ||
    Number(message.turnDuration) <= 0 ||
    !Number.isFinite(message.deadline)
  ) {
    throw new Error(`Invalid turn-timeout message ${record.messageId}.`);
  }

  return message as TurnTimeoutMessage;
}

export function duePlayer(match: MatchRecord, now = Date.now()): PlayerId | undefined {
  const state = match.engine_state;
  if (
    match.status !== "IN_PROGRESS" ||
    !state?.started ||
    state.winnerId ||
    !Number.isFinite(state.turnStartTime) ||
    !Number.isFinite(state.turnDuration) ||
    state.turnDuration <= 0
  ) {
    return undefined;
  }

  return now >= state.turnStartTime + state.turnDuration
    ? state.priorityPlayerId
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
    state.turnStartTime + state.turnDuration === message.deadline;
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

async function processRecord(record: SQSRecord): Promise<void> {
  const message = parseTurnTimeoutMessage(record);
  const match = await loadMatch(message.matchId);

  // Missing/finished matches and stale turn tokens are successful no-ops. SQS
  // can safely delete these messages.
  if (!match || !timeoutMessageMatches(match, message)) return;

  const originalState = match.engine_state;
  const playerId = duePlayer(match);
  if (!playerId) {
    // Defensive clock-skew handling: put the same authoritative turn back with
    // only its remaining delay instead of losing its timeout permanently.
    await enqueueTurnTimeout({
      matchId: match.match_id,
      state: originalState,
      stateVersion: match.state_version ?? 0
    });
    return;
  }

  const nextState = applyAction(originalState, { type: "TIME_OUT", playerId });
  const currentVersion = match.state_version ?? 0;
  const nextVersion = currentVersion + 1;

  // Start scheduling and the conditional state write concurrently. SQS must
  // never sit on the critical path before this due timeout is committed and
  // broadcast. A losing CAS only creates a harmless stale timeout token.
  const timeoutScheduling = enqueueTurnTimeout({
    matchId: match.match_id,
    state: nextState,
    stateVersion: nextVersion
  }).then(
    () => undefined,
    (error) => {
      console.error("Could not schedule the next turn timeout:", error);
    }
  );

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
        "turn_player_id = :nextPlayerId, state_version = :nextVersion",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":active": "IN_PROGRESS",
        ":version": currentVersion,
        ":nextVersion": nextVersion,
        ":turnStart": originalState.turnStartTime,
        ":turnDuration": originalState.turnDuration,
        ":playerId": playerId,
        ":state": nextState,
        ":status": nextState.winnerId ? "FINISHED" : "IN_PROGRESS",
        ":round": nextState.round,
        ":nextPlayerId": nextState.priorityPlayerId
      }
    }));
  } catch (error: any) {
    if (error?.name === "ConditionalCheckFailedException") {
      await timeoutScheduling;
      return;
    }
    throw error;
  }

  await publishState(match, nextState);
  await Promise.all([
    writeTimeoutLog(match.match_id, playerId, nextState),
    timeoutScheduling
  ]);
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  // Most records in an active match are intentionally stale because every
  // accepted action creates a new timer token. Process a received batch in
  // parallel so stale records from many matches cannot form a serial backlog.
  const outcomes = await Promise.all((event.Records ?? []).map(async (record) => {
    try {
      await processRecord(record);
      return undefined;
    } catch (error) {
      console.error("Turn-timeout message failed:", {
        messageId: record.messageId,
        error
      });
      return { itemIdentifier: record.messageId };
    }
  }));

  return {
    batchItemFailures: outcomes.filter(
      (failure): failure is { itemIdentifier: string } => Boolean(failure)
    )
  };
};
