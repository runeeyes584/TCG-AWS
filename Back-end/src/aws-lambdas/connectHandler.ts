import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { dynamoDb } from "../config/dynamodb";

const region = process.env.AWS_REGION || "ap-southeast-1";
const userPoolId = process.env.COGNITO_USER_POOL_ID || "";
const clientId = process.env.COGNITO_CLIENT_ID || "";

const docClient = dynamoDb;

// Khởi tạo Cognito JWKS verifier (nếu có cấu hình Cognito)
const JWKS = userPoolId
  ? createRemoteJWKSet(new URL(`https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`))
  : null;

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const queryParams = event.queryStringParameters || {};
  const token = queryParams.token || event.headers?.Authorization?.replace("Bearer ", "");

  if (!token || !JWKS) {
    return { statusCode: 401, body: "Unauthorized: Cognito access token is required." };
  }

  let userId: string;
  let username = queryParams.username || "Player";

  // 1. Xác thực Cognito access token trước khi mở WebSocket.
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
    });

    if (payload.token_use !== "access" || payload.client_id !== clientId || typeof payload.sub !== "string") {
      return { statusCode: 401, body: "Unauthorized: Invalid access token." };
    }
    userId = payload.sub;
    username = (payload.username as string) || username;
  } catch (err) {
    console.error("Token verification failed:", err);
    return { statusCode: 401, body: "Unauthorized: Invalid token." };
  }

  // 2. Lưu thông tin kết nối vào bảng Connections trong DynamoDB
  try {
    await docClient.send(
      new PutCommand({
        TableName: "Connections",
        Item: {
          connection_id: connectionId,
          user_id: userId,
          username: username,
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
