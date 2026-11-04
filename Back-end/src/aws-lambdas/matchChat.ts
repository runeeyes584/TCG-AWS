import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import type { PlayerId } from "../game/types";
import { CHAT_ERRORS, CHAT_RATE_LIMIT, createChatMessage, normalizeChatText } from "../shared/chat";

/**
 * The `chat-send` WebSocket route: relays one chat message to both players of a match in progress, by the same
 * rules as the Socket.IO server (shared/chat.ts). Nothing is stored; the sender is known by their connection, never
 * by what the browser says, and a refused sender is told why with `chat:error`.
 */

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";

type MatchPlayerRecord = {
  connection_id?: string;
  username?: string;
};

type MatchRecord = {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS" | "FINISHED";
  player_1?: MatchPlayerRecord;
  player_2?: MatchPlayerRecord | null;
};

/** A message the sender may not send; its text is what they are told. */
class ChatRefusal extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message);
  }
}

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

const isConditionFailed = (error: any) => error?.name === "ConditionalCheckFailedException";

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  const domainName = event.requestContext?.domainName as string | undefined;
  const stage = event.requestContext?.stage as string | undefined;
  if (!connectionId || !domainName || !stage) {
    return { statusCode: 400, body: "Missing WebSocket request context." };
  }
  const wsClient = new ApiGatewayManagementApiClient({ endpoint: `https://${domainName}/${stage}`, region });

  try {
    const { matchId, text } = parseBody(event.body);
    // The cheapest check first: a message that cannot be sent costs no read.
    const message = normalizeChatText(text);
    if (!message) throw new ChatRefusal(CHAT_ERRORS.invalidText, 400);

    const match = await readMatch(matchId);
    const sender = senderOf(match, connectionId);
    if (!(await takeChatAllowance(connectionId, Date.now()))) {
      throw new ChatRefusal(CHAT_ERRORS.tooFast, 429);
    }

    const chat = createChatMessage({ matchId, senderId: sender.playerId, username: sender.username, text: message });
    const recipients = [match.player_1?.connection_id, match.player_2?.connection_id];
    await Promise.all(recipients.map((recipient) =>
      recipient ? send(wsClient, recipient, { event: "chat:message", ...chat }) : undefined
    ));
    return { statusCode: 200, body: "Sent." };
  } catch (error) {
    const refusal = error instanceof ChatRefusal ? error : undefined;
    if (!refusal) console.error("Could not relay chat message:", error);
    const reason = refusal?.message ?? CHAT_ERRORS.unavailable;
    await send(wsClient, connectionId, { event: "chat:error", message: reason });
    return { statusCode: refusal?.statusCode ?? 500, body: reason };
  }
};

function parseBody(body: unknown): { matchId: string; text: unknown } {
  let parsed: any;
  try {
    parsed = typeof body === "string" ? JSON.parse(body || "{}") : (body ?? {});
  } catch {
    throw new ChatRefusal(CHAT_ERRORS.notInMatch, 400);
  }
  const matchId = typeof parsed?.matchId === "string" ? parsed.matchId.trim() : "";
  if (!matchId) throw new ChatRefusal(CHAT_ERRORS.notInMatch, 400);
  return { matchId, text: parsed.text };
}

async function readMatch(matchId: string): Promise<MatchRecord> {
  // Consistent, so a player who has just reconnected is known by their new connection.
  const { Item } = await dynamoDb.send(new GetCommand({
    TableName: gameStateTable,
    Key: { match_id: matchId },
    ConsistentRead: true
  }));
  if (!Item) throw new ChatRefusal(CHAT_ERRORS.notInMatch, 404);
  return Item as MatchRecord;
}

/**
 * The player behind this connection. Only a match in progress has a chat: a finished match still names its
 * players' connections, and one of them may already be playing another match.
 */
function senderOf(match: MatchRecord, connectionId: string): { playerId: PlayerId; username: string } {
  if (match.status === "WAITING") throw new ChatRefusal(CHAT_ERRORS.waitingForOpponent, 409);
  if (match.status !== "IN_PROGRESS") throw new ChatRefusal(CHAT_ERRORS.matchEnded, 409);
  if (!match.player_2) throw new ChatRefusal(CHAT_ERRORS.waitingForOpponent, 409);

  const playerId: PlayerId | undefined =
    match.player_1?.connection_id === connectionId ? "P1" :
    match.player_2.connection_id === connectionId ? "P2" :
    undefined;
  if (!playerId) throw new ChatRefusal(CHAT_ERRORS.notInMatch, 403);

  const record = playerId === "P1" ? match.player_1 : match.player_2;
  return { playerId, username: record?.username?.trim() || "Player" };
}

/**
 * Counts this message against the connection's allowance: `maxMessages` per fixed window of `windowMs`, kept on the
 * connection's own record so that every running instance of the function sees it. Both writes are conditional, so
 * two messages at once can never both open a window or both take the last place in one.
 */
async function takeChatAllowance(connectionId: string, now: number): Promise<boolean> {
  const { maxMessages, windowMs } = CHAT_RATE_LIMIT;
  const key = { connection_id: connectionId };
  const windowEdge = now - windowMs;

  try {
    // The previous window, if any, has run out: this message opens a new one.
    await dynamoDb.send(new UpdateCommand({
      TableName: connectionsTable,
      Key: key,
      UpdateExpression: "SET chat_window_start = :now, chat_count = :one",
      ConditionExpression:
        "attribute_exists(connection_id) AND (attribute_not_exists(chat_window_start) OR chat_window_start <= :windowEdge)",
      ExpressionAttributeValues: { ":now": now, ":one": 1, ":windowEdge": windowEdge }
    }));
    return true;
  } catch (error) {
    if (!isConditionFailed(error)) throw error;
  }

  try {
    // The window is still open: the message takes a place in it, if one is left.
    await dynamoDb.send(new UpdateCommand({
      TableName: connectionsTable,
      Key: key,
      UpdateExpression: "ADD chat_count :one",
      ConditionExpression: "attribute_exists(connection_id) AND chat_window_start > :windowEdge AND chat_count < :max",
      ExpressionAttributeValues: { ":one": 1, ":windowEdge": windowEdge, ":max": maxMessages }
    }));
    return true;
  } catch (error) {
    if (isConditionFailed(error)) return false;
    throw error;
  }
}

async function send(client: ApiGatewayManagementApiClient, connectionId: string, payload: Record<string, unknown>): Promise<void> {
  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(payload))
    }));
  } catch (error) {
    // A player who has just left misses the message; the others still get it.
    if (!isGone(error)) console.error("Could not send chat event:", error);
  }
}
