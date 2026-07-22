import { randomInt, randomUUID } from "node:crypto";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  GetConnectionCommand,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { createInitialGameState, applyAction } from "../game/core/engine";
import { buildDefaultDeck } from "../game/entities/defaultDeck";
import type { GameState, PlayerId } from "../game/types";
import { enqueueTurnTimeout } from "./turnTimeoutQueue";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";
const eloRange = positiveNumber(process.env.MATCHMAKING_ELO_RANGE, 200);
const waitingTtlSeconds = positiveNumber(process.env.MATCHMAKING_WAIT_TTL_SECONDS, 600);
const matchTtlSeconds = positiveNumber(process.env.MATCH_TTL_SECONDS, 86400);
const lockTtlSeconds = 10;
const matchmakingLockId = "__MATCHMAKING_LOCK__";
const roomCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const roomCodeLength = 6;
const privateRoomCreateAttempts = 8;

type MatchType = "PUBLIC" | "PRIVATE";
type StartRoute = "matchfinding-start" | "room-create" | "room-join";

type PlayerRecord = {
  user_id: string;
  connection_id: string;
  username: string;
  player_id: PlayerId;
  elo: number;
  connected: boolean;
};

type MatchRecord = {
  match_id: string;
  match_type?: MatchType;
  join_code?: string;
  status: "WAITING" | "IN_PROGRESS";
  player_1: PlayerRecord;
  player_2?: PlayerRecord | null;
  state_version?: number;
  engine_state: GameState;
  created_at: number;
  expire_at?: number;
};

class RequestError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "RequestError";
  }
}

export function normalizeRoomCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  if (normalized.length !== roomCodeLength) return undefined;
  return [...normalized].every((character) => roomCodeAlphabet.includes(character))
    ? normalized
    : undefined;
}

export function isPublicMatch(match: Pick<MatchRecord, "match_type">): boolean {
  // Records created before match_type was introduced belong to the public queue.
  return !match.match_type || match.match_type === "PUBLIC";
}

function parseBody(event: any): Record<string, unknown> {
  if (!event.body) return {};
  if (typeof event.body === "object") return event.body as Record<string, unknown>;
  try {
    const parsed = JSON.parse(event.body);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    throw new RequestError(400, "Request body must be valid JSON.");
  }
}

function requestRoute(event: any, body: Record<string, unknown>): StartRoute {
  const route = String(event.requestContext?.routeKey || body.route || "");
  if (route === "matchfinding-start" || route === "room-create" || route === "room-join") {
    return route;
  }
  throw new RequestError(400, `Unsupported WebSocket route: ${route || "unknown"}.`);
}

function generateRoomCode(): string {
  return Array.from(
    { length: roomCodeLength },
    () => roomCodeAlphabet[randomInt(roomCodeAlphabet.length)]
  ).join("");
}

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function finiteNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
}

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

function managementEndpoint(event: any): string {
  const configuredEndpoint = process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "");
  if (configuredEndpoint) return configuredEndpoint;
  return `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
}

async function sleep(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function acquireMatchmakingLock(owner: string): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const now = Math.floor(Date.now() / 1000);
    try {
      await dynamoDb.send(new PutCommand({
        TableName: gameStateTable,
        Item: {
          match_id: matchmakingLockId,
          status: "LOCK",
          lock_owner: owner,
          expire_at: now + lockTtlSeconds
        },
        ConditionExpression: "attribute_not_exists(match_id) OR expire_at < :now",
        ExpressionAttributeValues: { ":now": now }
      }));
      return;
    } catch (error: any) {
      if (error?.name !== "ConditionalCheckFailedException") throw error;
      await sleep(50 + attempt * 25);
    }
  }

  throw new Error("Matchmaking is busy. Please retry.");
}

async function releaseMatchmakingLock(owner: string): Promise<void> {
  try {
    await dynamoDb.send(new DeleteCommand({
      TableName: gameStateTable,
      Key: { match_id: matchmakingLockId },
      ConditionExpression: "lock_owner = :owner",
      ExpressionAttributeValues: { ":owner": owner }
    }));
  } catch (error: any) {
    if (error?.name !== "ConditionalCheckFailedException") {
      console.error("Unable to release matchmaking lock:", error);
    }
  }
}

async function loadElo(userId: string): Promise<number> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: userProfileTable,
    Key: { user_id: userId },
    ConsistentRead: true
  }));
  const item = result.Item;
  return finiteNumber(
    item?.stats?.elo_rating,
    item?.stats?.rank_points,
    item?.stats?.rating,
    item?.elo_rating,
    item?.rank_points,
    item?.rating,
    item?.elo
  ) ?? 1000;
}

async function loadWaitingMatches(): Promise<MatchRecord[]> {
  const matches: MatchRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: gameStateTable,
      FilterExpression:
        "#status = :waiting AND (attribute_not_exists(match_type) OR match_type = :public)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":waiting": "WAITING", ":public": "PUBLIC" },
      ExclusiveStartKey: exclusiveStartKey,
      ConsistentRead: true
    }));
    matches.push(...((result.Items || []) as MatchRecord[]));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return matches;
}

async function connectionIsAlive(
  wsClient: ApiGatewayManagementApiClient,
  connectionId: string
): Promise<boolean> {
  try {
    await wsClient.send(new GetConnectionCommand({ ConnectionId: connectionId }));
    return true;
  } catch (error) {
    if (isGone(error)) return false;
    throw error;
  }
}

async function sendMessage(
  wsClient: ApiGatewayManagementApiClient,
  connectionId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  try {
    await wsClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(payload))
    }));
    return true;
  } catch (error) {
    if (isGone(error)) return false;
    throw error;
  }
}

async function removeConnectionMatch(connectionId: string, matchId: string): Promise<void> {
  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: connectionsTable,
      Key: { connection_id: connectionId },
      UpdateExpression: "REMOVE match_id",
      ConditionExpression: "match_id = :matchId",
      ExpressionAttributeValues: { ":matchId": matchId }
    }));
  } catch (error: any) {
    if (error?.name !== "ConditionalCheckFailedException") throw error;
  }
}

async function deleteWaitingMatch(match: MatchRecord): Promise<void> {
  try {
    await dynamoDb.send(new DeleteCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      ConditionExpression: "#status = :waiting",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":waiting": "WAITING" }
    }));
    if (match.player_1?.connection_id) {
      await removeConnectionMatch(match.player_1.connection_id, match.match_id);
    }
  } catch (error: any) {
    if (error?.name !== "ConditionalCheckFailedException") throw error;
  }
}

async function createPublicWaitingMatch(input: {
  connectionId: string;
  userId: string;
  username: string;
  elo: number;
  wsClient: ApiGatewayManagementApiClient;
}): Promise<string> {
  const now = Date.now();
  const matchId = `MATCH_${now}_${randomUUID()}`;
  const initialEngineState = createInitialGameState(
    buildDefaultDeck("P1"),
    buildDefaultDeck("P2"),
    now
  );

  const match: MatchRecord = {
    match_id: matchId,
    match_type: "PUBLIC",
    status: "WAITING",
    player_1: {
      user_id: input.userId,
      connection_id: input.connectionId,
      username: input.username,
      player_id: "P1",
      elo: input.elo,
      connected: true
    },
    player_2: null,
    state_version: 0,
    engine_state: initialEngineState,
    created_at: now,
    expire_at: Math.floor(now / 1000) + waitingTtlSeconds
  };

  await dynamoDb.send(new PutCommand({
    TableName: gameStateTable,
    Item: {
      ...match,
      current_round: initialEngineState.round,
      turn_player_id: "P1"
    },
    ConditionExpression: "attribute_not_exists(match_id)"
  }));

  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: connectionsTable,
      Key: { connection_id: input.connectionId },
      UpdateExpression: "SET match_id = :matchId, connected_at = :connectedAt",
      ConditionExpression:
        "attribute_exists(connection_id) AND user_id = :userId AND attribute_not_exists(match_id)",
      ExpressionAttributeValues: {
        ":matchId": matchId,
        ":connectedAt": now,
        ":userId": input.userId
      }
    }));
  } catch (error) {
    await deleteWaitingMatch(match);
    if ((error as any)?.name === "ConditionalCheckFailedException") {
      throw new RequestError(409, "This connection is already assigned to another match.");
    }
    throw error;
  }

  const delivered = await sendMessage(input.wsClient, input.connectionId, {
    event: "matchmaking:searching",
    roomCode: matchId,
    elo: input.elo,
    eloRange
  });
  if (!delivered) {
    await deleteWaitingMatch(match);
    throw new Error("WebSocket connection closed before matchmaking started.");
  }

  return matchId;
}

async function claimMatch(
  match: MatchRecord,
  player2: PlayerRecord,
  player1Elo: number,
  expectedType: MatchType
): Promise<GameState | undefined> {
  const updatedEngineState = applyAction(match.engine_state, {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  const currentVersion = match.state_version ?? 0;
  const nextVersion = currentVersion + 1;

  // The first turn has no player action to schedule it. Register its deadline
  // before claiming the match; a losing claim only leaves a stale SQS message.
  await enqueueTurnTimeout({
    matchId: match.match_id,
    state: updatedEngineState,
    stateVersion: nextVersion
  });

  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      UpdateExpression:
        "SET #status = :active, player_1.elo = :player1Elo, player_2 = :player2, " +
        "engine_state = :engineState, expire_at = :expireAt, state_version = :nextVersion, " +
        "current_round = :round, turn_player_id = :nextPlayerId",
      ConditionExpression:
        "#status = :waiting AND (attribute_not_exists(player_2) OR player_2 = :emptyPlayer) " +
        "AND (attribute_not_exists(state_version) OR state_version = :currentVersion) " +
        "AND (attribute_not_exists(expire_at) OR expire_at > :now) AND " +
        (expectedType === "PUBLIC"
          ? "(attribute_not_exists(match_type) OR match_type = :expectedType)"
          : "match_type = :expectedType"),
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":active": "IN_PROGRESS",
        ":waiting": "WAITING",
        ":player1Elo": player1Elo,
        ":player2": player2,
        ":emptyPlayer": null,
        ":currentVersion": currentVersion,
        ":nextVersion": nextVersion,
        ":engineState": updatedEngineState,
        ":round": updatedEngineState.round,
        ":nextPlayerId": updatedEngineState.priorityPlayerId,
        ":expireAt": Math.floor(Date.now() / 1000) + matchTtlSeconds,
        ":now": Math.floor(Date.now() / 1000),
        ":expectedType": expectedType
      }
    }));
    return updatedEngineState;
  } catch (error: any) {
    if (error?.name === "ConditionalCheckFailedException") return undefined;
    throw error;
  }
}

async function sendRoomCreated(
  wsClient: ApiGatewayManagementApiClient,
  match: MatchRecord
): Promise<boolean> {
  return sendMessage(wsClient, match.player_1.connection_id, {
    event: "room:created",
    roomCode: match.join_code || match.match_id,
    playerId: "P1",
    opponentConnected: false,
    state: redactStateForPlayer(match.engine_state, "P1")
  });
}

async function createPrivateRoom(input: {
  connectionId: string;
  userId: string;
  username: string;
  elo: number;
  wsClient: ApiGatewayManagementApiClient;
}): Promise<string> {
  const now = Date.now();
  const initialEngineState = createInitialGameState(
    buildDefaultDeck("P1"),
    buildDefaultDeck("P2"),
    now
  );

  for (let attempt = 0; attempt < privateRoomCreateAttempts; attempt += 1) {
    const roomCode = generateRoomCode();
    const match: MatchRecord = {
      match_id: roomCode,
      match_type: "PRIVATE",
      join_code: roomCode,
      status: "WAITING",
      player_1: {
        user_id: input.userId,
        connection_id: input.connectionId,
        username: input.username,
        player_id: "P1",
        elo: input.elo,
        connected: true
      },
      player_2: null,
      state_version: 0,
      engine_state: initialEngineState,
      created_at: now,
      expire_at: Math.floor(now / 1000) + waitingTtlSeconds
    };

    try {
      await dynamoDb.send(new PutCommand({
        TableName: gameStateTable,
        Item: {
          ...match,
          current_round: initialEngineState.round,
          turn_player_id: "P1"
        },
        ConditionExpression: "attribute_not_exists(match_id)"
      }));
    } catch (error: any) {
      if (error?.name === "ConditionalCheckFailedException") continue;
      throw error;
    }

    try {
      await dynamoDb.send(new UpdateCommand({
        TableName: connectionsTable,
        Key: { connection_id: input.connectionId },
        UpdateExpression: "SET match_id = :matchId, connected_at = :connectedAt",
        ConditionExpression:
          "attribute_exists(connection_id) AND user_id = :userId AND attribute_not_exists(match_id)",
        ExpressionAttributeValues: {
          ":matchId": roomCode,
          ":connectedAt": now,
          ":userId": input.userId
        }
      }));
    } catch (error) {
      await deleteWaitingMatch(match);
      if ((error as any)?.name === "ConditionalCheckFailedException") {
        throw new RequestError(409, "This connection is already assigned to another match.");
      }
      throw error;
    }

    if (!(await sendRoomCreated(input.wsClient, match))) {
      await deleteWaitingMatch(match);
      throw new RequestError(410, "WebSocket connection closed before the room was created.");
    }
    return roomCode;
  }

  throw new Error("Unable to allocate a unique room code. Please retry.");
}

async function joinPrivateRoom(input: {
  roomCode: string;
  connectionId: string;
  userId: string;
  username: string;
  elo: number;
  wsClient: ApiGatewayManagementApiClient;
}): Promise<void> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: gameStateTable,
    Key: { match_id: input.roomCode },
    ConsistentRead: true
  }));
  const match = result.Item as MatchRecord | undefined;

  if (!match || match.match_type !== "PRIVATE") {
    throw new RequestError(404, "Private room was not found.");
  }
  if (match.status !== "WAITING") {
    throw new RequestError(409, "This room has already started.");
  }
  if (match.expire_at && match.expire_at <= Math.floor(Date.now() / 1000)) {
    await deleteWaitingMatch(match);
    throw new RequestError(410, "This room has expired.");
  }
  if (!match.player_1?.connection_id || !match.player_1?.user_id) {
    await deleteWaitingMatch(match);
    throw new RequestError(410, "This room is no longer available.");
  }
  if (match.player_1.user_id === input.userId) {
    if (
      match.player_1.connection_id !== input.connectionId &&
      await connectionIsAlive(input.wsClient, match.player_1.connection_id)
    ) {
      throw new RequestError(409, "This room is already open from another connection.");
    }

    try {
      await dynamoDb.send(new UpdateCommand({
        TableName: connectionsTable,
        Key: { connection_id: input.connectionId },
        UpdateExpression: "SET match_id = :matchId, connected_at = :connectedAt",
        ConditionExpression:
          "attribute_exists(connection_id) AND user_id = :userId AND attribute_not_exists(match_id)",
        ExpressionAttributeValues: {
          ":matchId": match.match_id,
          ":connectedAt": Date.now(),
          ":userId": input.userId
        }
      }));
    } catch (error) {
      if ((error as any)?.name === "ConditionalCheckFailedException") {
        throw new RequestError(409, "This connection is already assigned to another match.");
      }
      throw error;
    }

    try {
      await dynamoDb.send(new UpdateCommand({
        TableName: gameStateTable,
        Key: { match_id: match.match_id },
        UpdateExpression:
          "SET player_1.connection_id = :newConnectionId, player_1.connected = :connected",
        ConditionExpression:
          "#status = :waiting AND match_type = :privateType " +
          "AND player_1.user_id = :userId AND player_1.connection_id = :oldConnectionId " +
          "AND (attribute_not_exists(expire_at) OR expire_at > :now)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":waiting": "WAITING",
          ":privateType": "PRIVATE",
          ":userId": input.userId,
          ":oldConnectionId": match.player_1.connection_id,
          ":newConnectionId": input.connectionId,
          ":connected": true,
          ":now": Math.floor(Date.now() / 1000)
        }
      }));
    } catch (error) {
      await removeConnectionMatch(input.connectionId, match.match_id);
      if ((error as any)?.name === "ConditionalCheckFailedException") {
        throw new RequestError(409, "The room changed while it was being resumed. Please retry.");
      }
      throw error;
    }

    const resumedMatch: MatchRecord = {
      ...match,
      player_1: { ...match.player_1, connection_id: input.connectionId, connected: true }
    };
    if (!(await sendRoomCreated(input.wsClient, resumedMatch))) {
      await deleteWaitingMatch(resumedMatch);
      throw new RequestError(410, "WebSocket connection closed while resuming the room.");
    }
    return;
  }
  if (!(await connectionIsAlive(input.wsClient, match.player_1.connection_id))) {
    await deleteWaitingMatch(match);
    throw new RequestError(410, "The room owner is no longer connected.");
  }

  const player2: PlayerRecord = {
    user_id: input.userId,
    connection_id: input.connectionId,
    username: input.username,
    player_id: "P2",
    elo: input.elo,
    connected: true
  };
  const updatedEngineState = await claimMatch(match, player2, match.player_1.elo, "PRIVATE");
  if (!updatedEngineState) {
    throw new RequestError(409, "Another player joined this room first.");
  }

  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: connectionsTable,
      Key: { connection_id: input.connectionId },
      UpdateExpression: "SET match_id = :matchId, connected_at = :connectedAt",
      ConditionExpression:
        "attribute_exists(connection_id) AND user_id = :userId AND attribute_not_exists(match_id)",
      ExpressionAttributeValues: {
        ":matchId": match.match_id,
        ":connectedAt": Date.now(),
        ":userId": input.userId
      }
    }));
  } catch (error) {
    await deleteClaimedMatch(match, player2);
    if ((error as any)?.name === "ConditionalCheckFailedException") {
      throw new RequestError(409, "This connection is already assigned to another match.");
    }
    throw error;
  }

  const player1Delivered = await sendMessage(input.wsClient, match.player_1.connection_id, {
    event: "matchmaking:found",
    roomCode: match.match_id,
    playerId: "P1",
    opponentElo: input.elo,
    state: redactStateForPlayer(updatedEngineState, "P1")
  });
  if (!player1Delivered) {
    await deleteClaimedMatch(match, player2);
    throw new RequestError(410, "The room owner disconnected before the match started.");
  }

  const player2Delivered = await sendMessage(input.wsClient, input.connectionId, {
    event: "matchmaking:found",
    roomCode: match.match_id,
    playerId: "P2",
    opponentElo: match.player_1.elo,
    state: redactStateForPlayer(updatedEngineState, "P2")
  });
  if (!player2Delivered) {
    await deleteClaimedMatch(match, player2);
    await sendMessage(input.wsClient, match.player_1.connection_id, {
      event: "game:error",
      message: "The joining player disconnected before the match started. Create a new room to retry."
    });
    throw new RequestError(410, "Joining connection closed before match notification.");
  }
}

async function deleteClaimedMatch(match: MatchRecord, player2: PlayerRecord): Promise<void> {
  try {
    await dynamoDb.send(new DeleteCommand({
      TableName: gameStateTable,
      Key: { match_id: match.match_id },
      ConditionExpression:
        "#status = :active AND player_2.user_id = :userId AND player_2.connection_id = :connectionId",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":active": "IN_PROGRESS",
        ":userId": player2.user_id,
        ":connectionId": player2.connection_id
      }
    }));
  } catch (error: any) {
    if (error?.name !== "ConditionalCheckFailedException") throw error;
  }

  await Promise.allSettled([
    removeConnectionMatch(match.player_1.connection_id, match.match_id),
    removeConnectionMatch(player2.connection_id, match.match_id)
  ]);
}

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  if (!connectionId) return { statusCode: 400, body: "Missing connection ID." };

  const wsClient = new ApiGatewayManagementApiClient({
    endpoint: managementEndpoint(event),
    region
  });

  let lockOwner: string | undefined;
  try {
    const body = parseBody(event);
    const route = requestRoute(event, body);
    console.info("Matchmaking request received", {
      connectionId,
      route,
      region,
      connectionsTable,
      gameStateTable,
      userProfileTable,
      eloRange
    });

    const connectionResult = await dynamoDb.send(new GetCommand({
      TableName: connectionsTable,
      Key: { connection_id: connectionId },
      ConsistentRead: true
    }));
    const connection = connectionResult.Item;
    if (!connection?.user_id) {
      return { statusCode: 401, body: "Connection is not authenticated." };
    }

    const userId = String(connection.user_id);
    const username = String(connection.username || "Player");

    // Any start route may resume an active match. `matchfinding-start` also
    // resumes an existing waiting room after a WebSocket reconnect.
    const existingMatchId = typeof connection.match_id === "string" ? connection.match_id : undefined;
    if (existingMatchId) {
      const existing = await dynamoDb.send(new GetCommand({
        TableName: gameStateTable,
        Key: { match_id: existingMatchId },
        ConsistentRead: true
      }));
      const associatedMatch = existing.Item as MatchRecord | undefined;
      if (associatedMatch?.status === "IN_PROGRESS") {
        const playerId: PlayerId | undefined =
          associatedMatch.player_1?.user_id === userId && associatedMatch.player_1?.connection_id === connectionId ? "P1" :
          associatedMatch.player_2?.user_id === userId && associatedMatch.player_2?.connection_id === connectionId ? "P2" : undefined;
        if (playerId) {
          await sendMessage(wsClient, connectionId, {
            event: "matchmaking:found",
            roomCode: associatedMatch.match_id,
            playerId,
            state: redactStateForPlayer(associatedMatch.engine_state, playerId)
          });
          return { statusCode: 200, body: "Active match resumed." };
        }
        throw new RequestError(409, "This connection is associated with a different player session.");
      }

      if (associatedMatch?.status === "WAITING" && associatedMatch.match_type === "PRIVATE") {
        if (associatedMatch.expire_at && associatedMatch.expire_at <= Math.floor(Date.now() / 1000)) {
          await deleteWaitingMatch(associatedMatch);
        } else if (
          associatedMatch.player_1?.user_id === userId &&
          associatedMatch.player_1?.connection_id === connectionId
        ) {
          if (route === "room-join") {
            const requestedCode = normalizeRoomCode(body.roomCode ?? body.room_code);
            if (requestedCode !== associatedMatch.match_id) {
              throw new RequestError(409, "Cancel your current room before joining another one.");
            }
          }
          if (!(await sendRoomCreated(wsClient, associatedMatch))) {
            await deleteWaitingMatch(associatedMatch);
            throw new RequestError(410, "WebSocket connection closed while resuming the room.");
          }
          return { statusCode: 200, body: "Private room resumed." };
        } else {
          throw new RequestError(409, "This connection is already assigned to another room.");
        }
      } else if (associatedMatch?.status === "WAITING" && route !== "matchfinding-start") {
        throw new RequestError(409, "Cancel public matchmaking before creating or joining a room.");
      } else if (!associatedMatch || associatedMatch.status !== "WAITING") {
        await removeConnectionMatch(connectionId, existingMatchId);
      }
    }

    const playerElo = await loadElo(userId);
    console.info("Matchmaking player loaded", { connectionId, userId, playerElo });

    if (route === "room-create") {
      const roomCode = await createPrivateRoom({
        connectionId,
        userId,
        username,
        elo: playerElo,
        wsClient
      });
      return { statusCode: 200, body: `Private room ${roomCode} created.` };
    }

    if (route === "room-join") {
      const roomCode = normalizeRoomCode(body.roomCode ?? body.room_code);
      if (!roomCode) {
        throw new RequestError(
          400,
          `Room code must contain ${roomCodeLength} valid letters or digits.`
        );
      }
      await joinPrivateRoom({
        roomCode,
        connectionId,
        userId,
        username,
        elo: playerElo,
        wsClient
      });
      return { statusCode: 200, body: `Joined private room ${roomCode}.` };
    }

    const owner = String(event.requestContext?.requestId || randomUUID());
    lockOwner = owner;
    await acquireMatchmakingLock(owner);

    const nowSeconds = Math.floor(Date.now() / 1000);
    const waitingMatches = await loadWaitingMatches();
    const candidates: Array<{ match: MatchRecord; opponentElo: number }> = [];

    for (const match of waitingMatches) {
      if (!isPublicMatch(match)) continue;
      if (!match.player_1?.connection_id || !match.player_1?.user_id) {
        await deleteWaitingMatch(match);
        continue;
      }

      if (match.expire_at && match.expire_at <= nowSeconds) {
        await deleteWaitingMatch(match);
        continue;
      }

      const player1Alive = await connectionIsAlive(wsClient, match.player_1.connection_id);
      if (!player1Alive) {
        await deleteWaitingMatch(match);
        continue;
      }

      if (match.player_1.user_id === userId) {
        if (match.player_1.connection_id === connectionId) {
          await dynamoDb.send(new UpdateCommand({
            TableName: connectionsTable,
            Key: { connection_id: connectionId },
            UpdateExpression: "SET match_id = :matchId",
            ExpressionAttributeValues: { ":matchId": match.match_id }
          }));
          await sendMessage(wsClient, connectionId, {
            event: "matchmaking:searching",
            roomCode: match.match_id,
            elo: playerElo,
            eloRange
          });
          return { statusCode: 200, body: "Already waiting for an opponent." };
        }

        await sendMessage(wsClient, connectionId, {
          event: "game:error",
          message: "This account is already searching from another connection."
        });
        return { statusCode: 409, body: "Already in queue." };
      }

      // Always compare the latest rating from UserProfile. The value stored in a
      // WAITING record is only a snapshot and older queue records may not have it.
      const opponentElo = await loadElo(String(match.player_1.user_id));
      if (Math.abs(opponentElo - playerElo) <= eloRange) {
        candidates.push({ match, opponentElo });
      }
    }

    candidates.sort((left, right) => {
      const leftDifference = Math.abs(left.opponentElo - playerElo);
      const rightDifference = Math.abs(right.opponentElo - playerElo);
      return leftDifference - rightDifference || left.match.created_at - right.match.created_at;
    });

    for (const candidate of candidates) {
      const pendingMatch = candidate.match;
      const player2: PlayerRecord = {
        user_id: userId,
        connection_id: connectionId,
        username,
        player_id: "P2",
        elo: playerElo,
        connected: true
      };
      const updatedEngineState = await claimMatch(
        pendingMatch,
        player2,
        candidate.opponentElo,
        "PUBLIC"
      );
      if (!updatedEngineState) continue;

      try {
        await dynamoDb.send(new UpdateCommand({
          TableName: connectionsTable,
          Key: { connection_id: connectionId },
          UpdateExpression: "SET match_id = :matchId, connected_at = :connectedAt",
          ConditionExpression:
            "attribute_exists(connection_id) AND user_id = :userId AND attribute_not_exists(match_id)",
          ExpressionAttributeValues: {
            ":matchId": pendingMatch.match_id,
            ":connectedAt": Date.now(),
            ":userId": userId
          }
        }));
      } catch (error) {
        await deleteClaimedMatch(pendingMatch, player2);
        if ((error as any)?.name === "ConditionalCheckFailedException") continue;
        throw error;
      }

      const player1Delivered = await sendMessage(
        wsClient,
        pendingMatch.player_1.connection_id,
        {
          event: "matchmaking:found",
          roomCode: pendingMatch.match_id,
          playerId: "P1",
          opponentElo: playerElo,
          state: redactStateForPlayer(updatedEngineState, "P1")
        }
      );

      if (!player1Delivered) {
        await deleteClaimedMatch(pendingMatch, player2);
        continue;
      }

      const player2Delivered = await sendMessage(wsClient, connectionId, {
        event: "matchmaking:found",
        roomCode: pendingMatch.match_id,
        playerId: "P2",
        opponentElo: candidate.opponentElo,
        state: redactStateForPlayer(updatedEngineState, "P2")
      });

      if (!player2Delivered) {
        await deleteClaimedMatch(pendingMatch, player2);
        await sendMessage(wsClient, pendingMatch.player_1.connection_id, {
          event: "game:error",
          message: "The opponent disconnected before the match started. Please search again."
        });
        return { statusCode: 410, body: "Connection closed before match notification." };
      }

      return { statusCode: 200, body: "Match started." };
    }

    const matchId = await createPublicWaitingMatch({
      connectionId,
      userId,
      username,
      elo: playerElo,
      wsClient
    });
    return { statusCode: 200, body: `Waiting for opponent in ${matchId}.` };
  } catch (error: any) {
    console.error("StartMatch Error", {
      name: error?.name,
      message: error?.message,
      statusCode: error?.$metadata?.httpStatusCode,
      requestId: event.requestContext?.requestId,
      connectionId
    });
    const statusCode = error instanceof RequestError
      ? error.statusCode
      : error?.message === "Matchmaking is busy. Please retry."
        ? 503
        : 500;
    const publicMessage = statusCode === 500
      ? "Unable to start matchmaking."
      : statusCode === 503
        ? "Matchmaking is busy. Please try again."
        : error.message;
    await sendMessage(wsClient, connectionId, {
      event: "game:error",
      message: publicMessage
    }).catch(() => false);
    return { statusCode, body: publicMessage };
  } finally {
    if (lockOwner) await releaseMatchmakingLock(lockOwner);
  }
};

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
