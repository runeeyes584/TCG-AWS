import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { validateSaveDeckPayload } from "../decks/deck.types";

const region = process.env.AWS_REGION || "ap-southeast-1";
const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  const callbackUrl = event.requestContext?.domainName && event.requestContext?.stage
    ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    : null;
  const wsClient = callbackUrl
    ? new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region })
    : null;

  let body: unknown;
  try {
    body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  } catch {
    return respond(400, "Malformed JSON body.", wsClient, connectionId);
  }

  const validation = validateSaveDeckPayload(body);
  if (!validation.valid) {
    return respond(400, validation.message, wsClient, connectionId, validation.errors);
  }

  let userId: string | undefined;
  try {
    userId = await resolveAuthenticatedUserId(event, connectionId);
  } catch (error) {
    console.error("Could not resolve deck owner:", error);
    return respond(500, "Could not verify deck owner.", wsClient, connectionId);
  }
  if (!userId) {
    return respond(401, "Unauthorized.", wsClient, connectionId);
  }

  const updatedDeck = {
    ...validation.payload,
    cardIds: [...validation.payload.cardIds],
    updatedAt: Date.now(),
  };

  try {
    // Ensure the map exists, then update only this deck key. This prevents
    // concurrent saves for different decks from overwriting one another.
    await dynamoDb.send(new UpdateCommand({
      TableName: userProfileTable,
      Key: { user_id: userId },
      UpdateExpression: "SET #decks = if_not_exists(#decks, :emptyMap)",
      ConditionExpression: "attribute_exists(user_id)",
      ExpressionAttributeNames: { "#decks": "decks" },
      ExpressionAttributeValues: { ":emptyMap": {} },
    }));

    await dynamoDb.send(new UpdateCommand({
      TableName: userProfileTable,
      Key: { user_id: userId },
      UpdateExpression: "SET #decks.#deckId = :deck, updated_at = :updatedAt",
      ConditionExpression: "attribute_exists(user_id)",
      ExpressionAttributeNames: {
        "#decks": "decks",
        "#deckId": validation.payload.deckId,
      },
      ExpressionAttributeValues: {
        ":deck": updatedDeck,
        ":updatedAt": updatedDeck.updatedAt,
      },
    }));

    const successPayload = {
      success: true,
      event: "deck:saved",
      message: "Deck saved successfully.",
      deck: updatedDeck,
    };
    if (wsClient && connectionId) {
      await sendWsMessage(wsClient, connectionId, successPayload);
    }
    return { statusCode: 200, body: JSON.stringify(successPayload) };
  } catch (error: unknown) {
    console.error("SaveDeck Lambda Error:", error);
    const isMissingProfile = error instanceof Error && error.name === "ConditionalCheckFailedException";
    return respond(
      isMissingProfile ? 404 : 500,
      isMissingProfile ? "User profile not found." : "Could not save deck.",
      wsClient,
      connectionId
    );
  }
};

async function resolveAuthenticatedUserId(event: any, connectionId?: string): Promise<string | undefined> {
  const authorizer = event.requestContext?.authorizer;
  const authorizedUserId = authorizer?.principalId || authorizer?.jwt?.claims?.sub || authorizer?.claims?.sub;
  if (typeof authorizedUserId === "string" && authorizedUserId) {
    return authorizedUserId;
  }

  if (!connectionId) return undefined;
  const connection = await dynamoDb.send(new GetCommand({
    TableName: connectionsTable,
    Key: { connection_id: connectionId },
    ProjectionExpression: "user_id",
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
  const payload = { success: false, event: "deck:error", message, ...(errors ? { errors } : {}) };
  if (wsClient && connectionId) {
    await sendWsMessage(wsClient, connectionId, payload);
  }
  return { statusCode, body: JSON.stringify(payload) };
}

async function sendWsMessage(client: ApiGatewayManagementApiClient, connectionId: string, data: unknown) {
  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(data)),
    }));
  } catch (error) {
    console.error("Failed to send WS message:", error);
  }
}
