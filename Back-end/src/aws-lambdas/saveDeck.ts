import { GetCommand } from "@aws-sdk/lib-dynamodb";
import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand
} from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { validateSaveDeckPayload } from "../decks/deck.types";
import { listUserDecks, saveUserDeck } from "../user/user.repository";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  const wsClient = connectionId
    ? new ApiGatewayManagementApiClient({ endpoint: managementEndpoint(event), region })
    : null;

  let body: unknown;
  try {
    body = parseRequestBody(event);
  } catch {
    return respond(400, "Malformed JSON body.", wsClient, connectionId);
  }

  let userId: string | undefined;
  try {
    userId = await resolveAuthenticatedUserId(event, connectionId);
  } catch (error) {
    console.error("Could not resolve deck owner:", error);
    return respond(500, "Could not verify deck owner.", wsClient, connectionId);
  }
  if (!userId) return respond(401, "Unauthorized.", wsClient, connectionId);

  try {
    if (isListRequest(event, body)) {
      const decks = await listUserDecks(userId);
      const payload = { success: true, event: "deck:list", decks };
      if (wsClient && connectionId) await sendWsMessage(wsClient, connectionId, payload);
      return { statusCode: 200, body: JSON.stringify(payload) };
    }

    const validation = validateSaveDeckPayload(body);
    if (!validation.valid) {
      return respond(400, validation.message, wsClient, connectionId, validation.errors);
    }

    // saveUserDeck writes one deck key inside the authenticated user's real
    // UserProfile item; no client-provided user ID is ever accepted.
    const deck = await saveUserDeck(userId, validation.payload);
    const payload = {
      success: true,
      event: "deck:saved",
      message: "Deck saved successfully.",
      deck
    };
    if (wsClient && connectionId) await sendWsMessage(wsClient, connectionId, payload);
    return { statusCode: 200, body: JSON.stringify(payload) };
  } catch (error: any) {
    console.error("SaveDeck Lambda Error:", {
      name: error?.name,
      message: error?.message,
      requestId: event.requestContext?.requestId,
      connectionId
    });
    const missingProfile = error?.name === "ConditionalCheckFailedException";
    return respond(
      missingProfile ? 404 : 500,
      missingProfile ? "User profile not found." : "Could not save deck.",
      wsClient,
      connectionId
    );
  }
};

function isListRequest(event: any, body: unknown): boolean {
  const method = String(event.requestContext?.http?.method || event.httpMethod || "").toUpperCase();
  const action = body && typeof body === "object" ? (body as { action?: unknown }).action : undefined;
  return method === "GET" || action === "list";
}

function parseRequestBody(event: any): unknown {
  if (!event.body) return {};
  if (typeof event.body === "object") return event.body;
  const rawBody = event.isBase64Encoded
    ? Buffer.from(String(event.body), "base64").toString("utf8")
    : String(event.body);
  return JSON.parse(rawBody || "{}");
}

function managementEndpoint(event: any): string {
  const configured = process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "");
  if (configured) return configured;
  const domainName = event.requestContext?.domainName;
  const stage = event.requestContext?.stage;
  if (!domainName || !stage) throw new Error("WebSocket management endpoint is unavailable.");
  return `https://${domainName}/${stage}`;
}

async function resolveAuthenticatedUserId(
  event: any,
  connectionId?: string
): Promise<string | undefined> {
  const authorizer = event.requestContext?.authorizer;
  const authorizedUserId =
    authorizer?.principalId || authorizer?.jwt?.claims?.sub || authorizer?.claims?.sub;
  if (typeof authorizedUserId === "string" && authorizedUserId) return authorizedUserId;

  if (!connectionId) return undefined;
  const connection = await dynamoDb.send(new GetCommand({
    TableName: connectionsTable,
    Key: { connection_id: connectionId },
    ProjectionExpression: "user_id",
    ConsistentRead: true
  }));
  const connectedUserId = connection.Item?.user_id;
  return typeof connectedUserId === "string" && connectedUserId ? connectedUserId : undefined;
}

async function respond(
  statusCode: number,
  message: string,
  wsClient: ApiGatewayManagementApiClient | null,
  connectionId?: string,
  errors?: unknown
) {
  const payload = {
    success: false,
    event: "deck:error",
    message,
    ...(errors ? { errors } : {})
  };
  if (wsClient && connectionId) await sendWsMessage(wsClient, connectionId, payload);
  return { statusCode, body: JSON.stringify(payload) };
}

async function sendWsMessage(
  client: ApiGatewayManagementApiClient,
  connectionId: string,
  data: unknown
): Promise<void> {
  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(data))
    }));
  } catch (error: any) {
    if (error?.name !== "GoneException" && error?.$metadata?.httpStatusCode !== 410) {
      console.error("Failed to send deck response through WebSocket:", error);
    }
  }
}
