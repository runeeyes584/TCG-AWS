import { PutCommand } from "@aws-sdk/lib-dynamodb";
import type {
  APIGatewayProxyResult,
  APIGatewayProxyWebsocketEventV2
} from "aws-lambda";
import { verifyToken } from "../auth/verifyToken";
import { dynamoDb } from "../config/dynamodb";
import { env } from "../config/env";

const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";

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

  console.info("WebSocket connect request received", {
    connectionId,
    connectionsTable,
    dynamoRegion: process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1"
  });

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

    console.info("WebSocket connection persisted", { connectionId, userId });

    return { statusCode: 200, body: "Connected successfully." };
  } catch (error: any) {
    console.error("Connect Lambda Error:", {
      name: error?.name,
      message: error?.message,
      statusCode: error?.$metadata?.httpStatusCode
    });
    return { statusCode: 500, body: error?.message || "Unable to persist connection." };
  }
};
