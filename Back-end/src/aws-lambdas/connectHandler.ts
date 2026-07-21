import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type {
  APIGatewayProxyResult,
  APIGatewayProxyWebsocketEventV2
} from "aws-lambda";
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
  const bearerMatch = authorization?.match(/^Bearer\s+(.+)$/i);
  return bearerMatch?.[1]?.trim() || undefined;
}

function hasValidCognitoRegion(): boolean {
  const userPoolRegion = env.userPoolId.split("_", 1)[0];
  return Boolean(userPoolRegion) && userPoolRegion === env.region;
}

export const handler = async (
  event: ConnectEvent
): Promise<APIGatewayProxyResult> => {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters || {};
  const token = getAccessToken(event);

  if (!hasValidCognitoRegion()) {
    console.error(
      "COGNITO_REGION does not match the region encoded in COGNITO_USER_POOL_ID."
    );
    return { statusCode: 500, body: "Authentication is not configured." };
  }

  if (!token) {
    return { statusCode: 401, body: "Unauthorized: Missing token." };
  }

  let userId: string;
  let username = queryParams.username || "Player";

  try {
    // Reuse the same Cognito verifier as the HTTP backend. It validates the
    // issuer from COGNITO_REGION/COGNITO_USER_POOL_ID, token_use=access and
    // the COGNITO_CLIENT_ID claim, so AWS_REGION cannot override Cognito's region.
    const payload = await verifyToken(token);
    if (!payload.sub) {
      return { statusCode: 401, body: "Unauthorized: Invalid token claims." };
    }

    userId = payload.sub;
    username = (payload.username as string) || username;
  } catch (error) {
    console.error("Token verification failed:", error);
    return { statusCode: 401, body: "Unauthorized: Invalid token." };
  }

  try {
    await dynamoDb.send(
      new PutCommand({
        TableName: connectionsTable,
        Item: {
          connection_id: connectionId,
          user_id: userId,
          username,
          connected_at: Date.now()
        }
      })
    );

    // Connection IDs are ephemeral. Preserve an active match on reconnect by
    // binding the player's GameState record to this new WebSocket connection.
    // The HTTP pending-match endpoint can then reliably show the reconnect UI.
    let cursor: Record<string, unknown> | undefined;
    let reboundMatchId: string | undefined;
    do {
      const matches = await dynamoDb.send(new ScanCommand({
        TableName: gameStateTable,
        FilterExpression: "#status = :active AND (player_1.user_id = :userId OR player_2.user_id = :userId)",
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
          UpdateExpression: `SET ${playerPath}.connection_id = :connectionId, ${playerPath}.connected = :connected, ${playerPath}.reconnected_at = :now REMOVE ${playerPath}.disconnected_at`,
          ConditionExpression: "#status = :active",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":active": "IN_PROGRESS", ":connectionId": connectionId, ":connected": true, ":now": Date.now() }
        }));
        reboundMatchId = match.match_id;
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
    return { statusCode: 500, body: error.message };
  }
};
