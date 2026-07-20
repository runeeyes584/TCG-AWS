import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { validateDeck, DEFAULT_DECK_RULES } from "../game/rules/deckRules";

const region = process.env.AWS_REGION || "ap-southeast-1";

export interface SaveDeckPayload {
  deckId: string;
  deckName: string;
  cardIds: string[];
}

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId;
  const callbackUrl = event.requestContext?.domainName && event.requestContext?.stage
    ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    : null;

  const wsClient = callbackUrl ? new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region }) : null;

  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  const userId = body.userId || event.requestContext?.authorizer?.principalId || connectionId;
  const { deckId, deckName, cardIds } = body as SaveDeckPayload;

  if (!userId || !deckId || !Array.isArray(cardIds)) {
    const errorMsg = "Missing userId, deckId, or cardIds array.";
    if (wsClient && connectionId) await sendWsMessage(wsClient, connectionId, { event: "deck:error", message: errorMsg });
    return { statusCode: 400, body: JSON.stringify({ error: errorMsg }) };
  }

  // 1. Kiểm tra tính hợp lệ của bộ bài theo luật Deck Builder (mỗi lá gốc chỉ xuất hiện 1 lần)
  const validationResult = validateDeck(cardIds, {
    deckSize: cardIds.length,
    maxCopiesPerCard: 1
  });
  if (!validationResult.valid) {
    const errorDetails = validationResult.errors.map(e => `${e.code}: ${e.message}`).join("; ");
    if (wsClient && connectionId) {
      await sendWsMessage(wsClient, connectionId, {
        event: "deck:error",
        message: `Invalid deck: ${errorDetails}`,
        errors: validationResult.errors
      });
    }
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid deck", errors: validationResult.errors })
    };
  }

  try {
    // 2. Tải UserProfile hiện tại của người chơi
    const userResult = await dynamoDb.send(
      new GetCommand({
        TableName: "UserProfile",
        Key: { user_id: userId }
      })
    );

    const userProfile = userResult.Item || { user_id: userId, decks: {} };
    const currentDecks = userProfile.decks || {};

    const updatedDeck = {
      deckId,
      deckName: deckName || `Deck ${deckId}`,
      cardIds,
      updatedAt: Date.now()
    };

    currentDecks[deckId] = updatedDeck;

    // 3. Cập nhật danh sách bộ bài vào UserProfile trong DynamoDB
    await dynamoDb.send(
      new UpdateCommand({
        TableName: "UserProfile",
        Key: { user_id: userId },
        UpdateExpression: "SET decks = :decks, updated_at = :uAt",
        ExpressionAttributeValues: {
          ":decks": currentDecks,
          ":uAt": Date.now()
        }
      })
    );

    const successPayload = {
      event: "deck:saved",
      message: "Deck saved successfully.",
      deck: updatedDeck
    };

    if (wsClient && connectionId) {
      await sendWsMessage(wsClient, connectionId, successPayload);
    }

    return {
      statusCode: 200,
      body: JSON.stringify(successPayload)
    };
  } catch (error: any) {
    console.error("SaveDeck Lambda Error:", error);
    if (wsClient && connectionId) {
      await sendWsMessage(wsClient, connectionId, { event: "deck:error", message: error.message });
    }
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

async function sendWsMessage(client: ApiGatewayManagementApiClient, connectionId: string, data: any) {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify(data))
      })
    );
  } catch (err) {
    console.error("Failed to send WS message:", err);
  }
}
