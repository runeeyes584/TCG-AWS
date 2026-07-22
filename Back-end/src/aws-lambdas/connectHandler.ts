import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyResult, APIGatewayProxyWebsocketEventV2 } from "aws-lambda";
import { verifyToken } from "../auth/verifyToken";
import { dynamoDb } from "../config/dynamodb";
import { env } from "../config/env";

const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";

type ConnectEvent = APIGatewayProxyWebsocketEventV2 & {
  headers?: Record<string, string | undefined>;
};

function getAccessToken(event: ConnectEvent): string | undefined {
  const queryToken = event.queryStringParameters?.token?.trim();
  if (queryToken) return queryToken;
  const authorization = event.headers?.authorization ?? event.headers?.Authorization;
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || undefined;
}

function hasValidCognitoRegion(): boolean {
  const userPoolRegion = env.userPoolId.split("_", 1)[0];
  return Boolean(userPoolRegion) && userPoolRegion === env.region;
}

export const handler = async (event: ConnectEvent): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;
  const token = getAccessToken(event);

  if (!hasValidCognitoRegion()) {
    console.error("COGNITO_REGION does not match COGNITO_USER_POOL_ID.");
    return { statusCode: 500, body: "Authentication is not configured." };
  }
  if (!token) return { statusCode: 401, body: "Unauthorized: Missing token." };

  let userId: string;
  let username = event.queryStringParameters?.username || "Player";
  try {
    // The shared verifier checks issuer, client ID and token_use=access.
    const payload = await verifyToken(token);
    if (!payload.sub) return { statusCode: 401, body: "Unauthorized: Invalid token claims." };
    userId = payload.sub;
    username = (payload.username as string) || username;
  } catch (error) {
    console.error("Token verification failed:", error);
    return { statusCode: 401, body: "Unauthorized: Invalid token." };
  }

  try {
    await dynamoDb.send(new PutCommand({
      TableName: connectionsTable,
      Item: { connection_id: connectionId, user_id: userId, username, connected_at: Date.now() }
    }));

    // Rebind an active match to the ephemeral API Gateway connection ID.
    let cursor: Record<string, unknown> | undefined;
    let reboundMatchId: string | undefined;
    do {
      const matches = await dynamoDb.send(new ScanCommand({
        TableName: gameStateTable,
        FilterExpression:
          "#status = :active AND (player_1.user_id = :userId OR player_2.user_id = :userId)",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":active": "IN_PROGRESS", ":userId": userId },
        ExclusiveStartKey: cursor,
        ConsistentRead: true
      }));
      const match = matches.Items?.[0] as any;
      if (match) {
        const playerPath = match.player_1?.user_id === userId ? "player_1" : "player_2";
        await dynamoDb.send(new UpdateCommand({
          TableName: gameStateTable,
          Key: { match_id: match.match_id },
          UpdateExpression:
            `SET ${playerPath}.connection_id = :connectionId, ` +
            `${playerPath}.connected = :connected, ${playerPath}.reconnected_at = :now ` +
            `REMOVE ${playerPath}.disconnected_at`,
          ConditionExpression: "#status = :active",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":active": "IN_PROGRESS",
            ":connectionId": connectionId,
            ":connected": true,
            ":now": Date.now()
          }
        }));
        reboundMatchId = String(match.match_id);
        break;
      }
      cursor = matches.LastEvaluatedKey;
    } while (cursor);

    if (reboundMatchId) {
      await dynamoDb.send(new UpdateCommand({
        TableName: connectionsTable,
        Key: { connection_id: connectionId },
        UpdateExpression: "SET match_id = :matchId",
        ExpressionAttributeValues: { ":matchId": reboundMatchId }
      }));
    }
    return { statusCode: 200, body: "Connected successfully." };
  } catch (error: any) {
    console.error("Connect Lambda Error:", error);
    return { statusCode: 500, body: "Unable to register WebSocket connection." };
  }
};
