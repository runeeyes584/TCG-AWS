import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import type { GameState as EngineGameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const gameLogsTable = process.env.GAME_LOGS_TABLE || "GameLogs";

type MatchRecord = {
  match_id: string;
  status: "IN_PROGRESS" | "FINISHED";
  engine_state: EngineGameState;
  player_1?: { connection_id?: string; connected?: boolean };
  player_2?: { connection_id?: string; connected?: boolean };
};

function endpoint(event: any): string | undefined {
  return process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "") ||
    (event.requestContext?.domainName && event.requestContext?.stage
      ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
      : undefined);
}

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

function duePlayer(match: MatchRecord): PlayerId | undefined {
  const state = match.engine_state;
  if (!state || !state.activePlayerId || !state.turnStartTime || !state.turnDuration) return undefined;
  return Date.now() >= state.turnStartTime + state.turnDuration ? state.activePlayerId : undefined;
}

function redactStateForPlayer(state: EngineGameState, viewerId: PlayerId): EngineGameState {
  const visible = structuredClone(state);
  const opponentId: PlayerId = viewerId === "P1" ? "P2" : "P1";
  const opponent = visible.players[opponentId];
  opponent.hand = opponent.hand.map((_, index) => ({ instanceId: `hidden-hand-${opponentId}-${index}`, cardId: "hidden-card", ownerId: opponentId }));
  opponent.deck = opponent.deck.map((_, index) => ({ instanceId: `hidden-deck-${opponentId}-${index}`, cardId: "hidden-card", ownerId: opponentId }));
  return visible;
}

async function sendUpdates(event: any, match: MatchRecord, state: EngineGameState): Promise<void> {
  const wsEndpoint = endpoint(event);
  if (!wsEndpoint) return;
  const client = new ApiGatewayManagementApiClient({ endpoint: wsEndpoint, region });
  const entries: Array<[string | undefined, PlayerId, boolean]> = [
    [match.player_1?.connection_id, "P1", match.player_2?.connected !== false],
    [match.player_2?.connection_id, "P2", match.player_1?.connected !== false]
  ];
  await Promise.all(entries.map(async ([connectionId, playerId, opponentConnected]) => {
    if (!connectionId) return;
    try {
      await client.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ event: "room:update", roomCode: match.match_id, playerId, opponentConnected, state: redactStateForPlayer(state, playerId) }))
      }));
    } catch (error) {
      if (!isGone(error)) console.error("Could not publish timeout update:", error);
    }
  }));
}

async function processMatch(event: any, match: MatchRecord, playerId: PlayerId): Promise<"processed" | "skipped"> {
  const originalState = match.engine_state;
  if (originalState.activePlayerId !== playerId || !duePlayer(match)) return "skipped";
  const nextState = applyAction(originalState, { type: "TIME_OUT", playerId });
  const finished = Boolean(nextState.winnerId);

  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      // The old timer is a compare-and-swap lock: duplicate EventBridge invocations cannot charge an AFK twice.
      ConditionExpression: "#status = :active AND engine_state.turnStartTime = :turnStart AND engine_state.activePlayerId = :playerId",
      UpdateExpression: "SET engine_state = :state, #status = :status, current_round = :round",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":active": "IN_PROGRESS", ":turnStart": originalState.turnStartTime, ":playerId": playerId,
        ":state": nextState, ":status": finished ? "FINISHED" : "IN_PROGRESS", ":round": nextState.round
      }
    }));
  } catch (error: any) {
    if (error?.name === "ConditionalCheckFailedException") return "skipped";
    throw error;
  }

  await dynamoDb.send(new PutCommand({
    TableName: gameLogsTable,
    Item: {
      match_id: match.match_id,
      action_sequence: Date.now(),
      actor_id: playerId,
      action_type: "TIME_OUT",
      details: { playerId, round: nextState.round, afkCount: nextState.players[playerId].consecutiveAfkCount },
      timestamp: Date.now()
    }
  }));

  await sendUpdates(event, match, nextState);
  return "processed";
}

async function findDueMatches(): Promise<MatchRecord[]> {
  const matches: MatchRecord[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const response = await dynamoDb.send(new ScanCommand({
      TableName: gameStateTable,
      FilterExpression: "#status = :active",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":active": "IN_PROGRESS" },
      ExclusiveStartKey: cursor,
      ConsistentRead: true
    }));
    matches.push(...((response.Items || []) as MatchRecord[]));
    cursor = response.LastEvaluatedKey;
  } while (cursor);
  return matches;
}

/**
 * WebSocket invocation is retained for compatibility but accepts a timeout only after it is due.
 * Production timeouts must be invoked by an EventBridge schedule; in that mode the event has no matchId.
 */
export const handler = async (event: any) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
    const matchId = body.matchId || event.matchId;
    const connectionId = event.requestContext?.connectionId as string | undefined;

    if (matchId) {
      const response = await dynamoDb.send(new GetCommand({ TableName: gameStateTable, Key: { match_id: matchId }, ConsistentRead: true }));
      const match = response.Item as MatchRecord | undefined;
      if (!match || match.status !== "IN_PROGRESS") return { statusCode: 404, body: JSON.stringify({ error: "Match is not active." }) };
      const playerId: PlayerId | undefined = connectionId === match.player_1?.connection_id ? "P1" : connectionId === match.player_2?.connection_id ? "P2" : undefined;
      if (!playerId) return { statusCode: 403, body: JSON.stringify({ error: "Connection is not a player in this match." }) };
      if (!duePlayer(match)) return { statusCode: 409, body: JSON.stringify({ error: "Turn has not timed out." }) };
      const result = await processMatch(event, match, playerId);
      return { statusCode: result === "processed" ? 200 : 409, body: JSON.stringify({ result, matchId }) };
    }

    const due = await findDueMatches();
    let processed = 0;
    for (const match of due) {
      const playerId = duePlayer(match);
      if (playerId && await processMatch(event, match, playerId) === "processed") processed += 1;
    }
    return { statusCode: 200, body: JSON.stringify({ processed, inspected: due.length }) };
  } catch (error: any) {
    console.error("HandleTimeout Lambda Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Unable to process timeouts." }) };
  }
};
