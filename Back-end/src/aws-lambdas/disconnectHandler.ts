import { DeleteCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";

type MatchRecord = {
  match_id: string;
  status: "WAITING" | "IN_PROGRESS";
  player_1?: { connection_id?: string };
  player_2?: { connection_id?: string } | null;
};

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

function managementEndpoint(event: any): string {
  const configuredEndpoint = process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "");
  if (configuredEndpoint) return configuredEndpoint;
  return `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
}

async function findMatches(connectionId: string): Promise<MatchRecord[]> {
  const matches: MatchRecord[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: gameStateTable,
      FilterExpression:
        "(#status = :waiting OR #status = :active) AND " +
        "(player_1.connection_id = :connectionId OR player_2.connection_id = :connectionId)",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":waiting": "WAITING",
        ":active": "IN_PROGRESS",
        ":connectionId": connectionId
      },
      ExclusiveStartKey: exclusiveStartKey,
      ConsistentRead: true
    }));
    matches.push(...((result.Items || []) as MatchRecord[]));
    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return matches;
}

async function notifyOpponent(
  wsClient: ApiGatewayManagementApiClient,
  connectionId: string,
  matchId: string
): Promise<void> {
  try {
    await wsClient.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify({
        event: "game:error",
        roomCode: matchId,
        message: "Opponent has disconnected."
      }))
    }));
  } catch (error) {
    if (!isGone(error)) console.error("Failed to notify opponent:", error);
  }
}

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  if (!connectionId) return { statusCode: 400, body: "Missing connection ID." };

  const wsClient = new ApiGatewayManagementApiClient({
    endpoint: managementEndpoint(event),
    region
  });

  try {
    const matches = await findMatches(connectionId);

    for (const match of matches) {
      const isPlayer1 = match.player_1?.connection_id === connectionId;
      const isPlayer2 = match.player_2?.connection_id === connectionId;

      if (match.status === "WAITING" && isPlayer1) {
        try {
          await dynamoDb.send(new DeleteCommand({
            TableName: gameStateTable,
            Key: { match_id: match.match_id },
            ConditionExpression:
              "#status = :waiting AND player_1.connection_id = :connectionId",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":waiting": "WAITING",
              ":connectionId": connectionId
            }
          }));
        } catch (error: any) {
          if (error?.name !== "ConditionalCheckFailedException") throw error;
        }
        continue;
      }

      if (match.status !== "IN_PROGRESS" || (!isPlayer1 && !isPlayer2)) continue;

      const connectedPath = isPlayer1 ? "player_1.connected" : "player_2.connected";
      try {
        await dynamoDb.send(new UpdateCommand({
          TableName: gameStateTable,
          Key: { match_id: match.match_id },
          UpdateExpression: `SET ${connectedPath} = :disconnected`,
          ConditionExpression: "#status = :active",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":active": "IN_PROGRESS",
            ":disconnected": false
          }
        }));
      } catch (error: any) {
        if (error?.name === "ConditionalCheckFailedException") continue;
        throw error;
      }

      const opponentConnectionId = isPlayer1
        ? match.player_2?.connection_id
        : match.player_1?.connection_id;
      if (opponentConnectionId) {
        await notifyOpponent(wsClient, opponentConnectionId, match.match_id);
      }
    }

    await dynamoDb.send(new DeleteCommand({
      TableName: connectionsTable,
      Key: { connection_id: connectionId }
    }));

    return { statusCode: 200, body: "Disconnected successfully." };
  } catch (error: any) {
    console.error("Disconnect Lambda Error:", error);
    return { statusCode: 500, body: error?.message || "Unable to disconnect." };
  }
};
