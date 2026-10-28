import {
  ApiGatewayManagementApiClient,
  DeleteConnectionCommand,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { QueryCommand, ScanCommand, type QueryCommandOutput, type ScanCommandOutput } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import type { SessionReplacedReason } from "../shared/multiplayer";

/**
 * Pushes a player's other WebSocket connections out when the player starts using the game somewhere else: each one
 * is told why (`session:replaced`) and then closed, so it stops sending moves and cannot steal the match back.
 */

const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";
const userIndex = process.env.CONNECTIONS_USER_INDEX || "UserIndex";
const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";

export type ReplacedReason = SessionReplacedReason;

export interface PlayerConnection {
  readonly connectionId: string;
  readonly sessionId?: string;
}

function isMissingIndexError(error: unknown): boolean {
  const candidate = error as { name?: string; message?: string } | undefined;
  return candidate?.name === "ValidationException" && /index/i.test(candidate.message ?? "");
}

const toConnection = (item: Record<string, unknown>): PlayerConnection => ({
  connectionId: String(item.connection_id),
  ...(typeof item.session_id === "string" ? { sessionId: item.session_id } : {})
});

/** Every recorded connection of the player; reads the user index, or the whole table until the index exists. */
export async function findPlayerConnections(userId: string): Promise<PlayerConnection[]> {
  const connections: PlayerConnection[] = [];
  let cursor: Record<string, unknown> | undefined;
  try {
    do {
      const page: QueryCommandOutput = await dynamoDb.send(new QueryCommand({
        TableName: connectionsTable,
        IndexName: userIndex,
        KeyConditionExpression: "user_id = :userId",
        ExpressionAttributeValues: { ":userId": userId },
        ExclusiveStartKey: cursor
      }));
      connections.push(...(page.Items ?? []).map(toConnection));
      cursor = page.LastEvaluatedKey;
    } while (cursor);
    return connections;
  } catch (error) {
    if (!isMissingIndexError(error)) throw error;
  }

  console.warn(`Connections index ${userIndex} is unavailable; falling back to a table scan.`);
  cursor = undefined;
  do {
    const page: ScanCommandOutput = await dynamoDb.send(new ScanCommand({
      TableName: connectionsTable,
      FilterExpression: "user_id = :userId",
      ExpressionAttributeValues: { ":userId": userId },
      ExclusiveStartKey: cursor
    }));
    connections.push(...(page.Items ?? []).map(toConnection));
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return connections;
}

const isGone = (error: unknown) => {
  const candidate = error as { name?: string; $metadata?: { httpStatusCode?: number } } | undefined;
  return candidate?.name === "GoneException" || candidate?.$metadata?.httpStatusCode === 410;
};

/**
 * Tells each connection why it is being closed, then closes it. A connection that is already gone is skipped. Runs
 * the connections one after the other: there are only ever a few.
 */
export async function evictConnections(
  endpoint: string,
  connections: readonly PlayerConnection[],
  reasonFor: (connection: PlayerConnection) => ReplacedReason
): Promise<number> {
  if (connections.length === 0) return 0;
  const client = new ApiGatewayManagementApiClient({ endpoint: endpoint.replace(/\/$/, ""), region });
  let evicted = 0;
  for (const connection of connections) {
    try {
      await client.send(new PostToConnectionCommand({
        ConnectionId: connection.connectionId,
        Data: Buffer.from(JSON.stringify({ event: "session:replaced", reason: reasonFor(connection) }))
      }));
      await client.send(new DeleteConnectionCommand({ ConnectionId: connection.connectionId }));
      evicted += 1;
    } catch (error) {
      if (!isGone(error)) console.warn("Could not close a replaced connection:", connection.connectionId, error);
    }
  }
  return evicted;
}

/** The reason to give a connection pushed out by a session: another tab of the same sign-in, or a newer sign-in. */
export const replacedReason = (activeSessionId: string | undefined) =>
  (connection: PlayerConnection): ReplacedReason =>
    activeSessionId && connection.sessionId === activeSessionId ? "tab" : "device";
