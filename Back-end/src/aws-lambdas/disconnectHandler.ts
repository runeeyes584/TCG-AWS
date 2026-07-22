import { DeleteCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import type { GameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";

type MatchRecord = {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS";
  engine_state: GameState;
  player_1?: { connection_id?: string; connected?: boolean };
  player_2?: { connection_id?: string; connected?: boolean } | null;
};

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

function managementEndpoint(event: any): string {
  return process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "") ||
    `https://${event.requestContext?.domainName}/${event.requestContext?.stage}`;
}

async function findMatches(connectionId: string): Promise<MatchRecord[]> {
  const matches: MatchRecord[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: gameStateTable,
      FilterExpression: "(#status = :waiting OR #status = :active) AND (player_1.connection_id = :id OR player_2.connection_id = :id)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":waiting": "WAITING", ":active": "IN_PROGRESS", ":id": connectionId },
      ExclusiveStartKey: cursor,
      ConsistentRead: true
    }));
    matches.push(...((result.Items || []) as MatchRecord[]));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return matches;
}

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  if (!connectionId) return { statusCode: 400, body: "Missing connection ID." };

  const wsClient = new ApiGatewayManagementApiClient({ endpoint: managementEndpoint(event), region });
  try {
    for (const match of await findMatches(connectionId)) {
      const isP1 = match.player_1?.connection_id === connectionId;
      const isP2 = match.player_2?.connection_id === connectionId;

      // A disconnected queue member is not a disconnected player. Remove the queue entry silently.
      if (match.status === "WAITING" && isP1) {
        try {
          await dynamoDb.send(new DeleteCommand({
            TableName: gameStateTable,
            Key: { match_id: match.match_id },
            ConditionExpression: "#status = :waiting AND player_1.connection_id = :id",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: { ":waiting": "WAITING", ":id": connectionId }
          }));
        } catch (error: any) {
          if (error?.name !== "ConditionalCheckFailedException") throw error;
        }
        continue;
      }

      if (match.status !== "IN_PROGRESS" || (!isP1 && !isP2)) continue;
      const playerPath = isP1 ? "player_1" : "player_2";
      const opponentConnectionId = isP1 ? match.player_2?.connection_id : match.player_1?.connection_id;
      const opponentPlayerId: PlayerId = isP1 ? "P2" : "P1";

      try {
        await dynamoDb.send(new UpdateCommand({
          TableName: gameStateTable,
          Key: { match_id: match.match_id },
          UpdateExpression: `SET ${playerPath}.connected = :false, ${playerPath}.disconnected_at = :now`,
          ConditionExpression: "#status = :active AND " + playerPath + ".connection_id = :id",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":active": "IN_PROGRESS", ":id": connectionId, ":false": false, ":now": Date.now() }
        }));
      } catch (error: any) {
        if (error?.name === "ConditionalCheckFailedException") continue;
        throw error;
      }

      if (opponentConnectionId) {
        try {
          await wsClient.send(new PostToConnectionCommand({
            ConnectionId: opponentConnectionId,
            Data: Buffer.from(JSON.stringify({
              event: "room:update",
              roomCode: match.match_id,
              playerId: opponentPlayerId,
              opponentConnected: false,
              state: redactStateForPlayer(match.engine_state, opponentPlayerId)
            }))
          }));
        } catch (error) {
          if (!isGone(error)) console.error("Failed to notify opponent:", error);
        }
      }
    }

    await dynamoDb.send(new DeleteCommand({ TableName: connectionsTable, Key: { connection_id: connectionId } }));
    return { statusCode: 200, body: "Disconnected successfully." };
  } catch (error: any) {
    console.error("Disconnect Lambda Error:", error);
    return { statusCode: 500, body: error?.message || "Unable to disconnect." };
  }
};

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
