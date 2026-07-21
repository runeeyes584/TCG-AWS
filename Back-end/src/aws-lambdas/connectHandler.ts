import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { dynamoDb } from "../config/dynamodb";

const region = process.env.AWS_REGION || "ap-southeast-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
const clientId = process.env.COGNITO_CLIENT_ID || "";
const docClient = dynamoDb;

const JWKS = userPoolId
  ? createRemoteJWKSet(
      new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`)
    )
  : null;

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters || {};
  const token = queryParams.token || event.headers?.Authorization?.replace("Bearer ", "");

  if (!JWKS || !clientId) {
    console.error("COGNITO_USER_POOL_ID or COGNITO_CLIENT_ID is not configured.");
    return { statusCode: 500, body: "Authentication is not configured." };
  }
  if (!token) {
    return { statusCode: 401, body: "Unauthorized: Missing token." };
  }

  let userId: string;
  let username = queryParams.username || "Player";

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
    });

    if (payload.token_use !== "access" || payload.client_id !== clientId || !payload.sub) {
      return { statusCode: 401, body: "Unauthorized: Invalid token claims." };
    }

    userId = payload.sub;
    username = (payload.username as string) || username;
  } catch (error) {
    console.error("Token verification failed:", error);
    return { statusCode: 401, body: "Unauthorized: Invalid token." };
  }

  try {
    await docClient.send(
      new PutCommand({
        TableName: "Connections",
        Item: {
          connection_id: connectionId,
          user_id: userId,
          username,
          connected_at: Date.now()
        }
      })
    );

    return { statusCode: 200, body: "Connected successfully." };
  } catch (error: any) {
    console.error("Connect Lambda Error:", error);
    return { statusCode: 500, body: error.message };
  }
};
