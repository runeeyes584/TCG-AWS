import { DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const connectionsTable = process.env.CONNECTIONS_TABLE || "Connections";
const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";

function endpoint(event: any): string {
  return process.env.WS_MANAGEMENT_ENDPOINT?.replace(/\/$/, "") ||
    `https://${event.requestContext?.domainName}/${event.requestContext?.stage}`;
}

function isGone(error: any): boolean {
  return error?.name === "GoneException" || error?.$metadata?.httpStatusCode === 410;
}

/** Cancels only a queue entry. An IN_PROGRESS match must be surrendered through game-surrender. */
export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId as string | undefined;
  if (!connectionId) return { statusCode: 400, body: "Missing connection ID." };

  try {
    const connection = await dynamoDb.send(new GetCommand({
      TableName: connectionsTable,
      Key: { connection_id: connectionId },
      ConsistentRead: true
    }));
    const matchId = connection.Item?.match_id as string | undefined;

    if (!matchId) {
      return { statusCode: 200, body: JSON.stringify({ message: "No matchmaking request to cancel." }) };
    }

    const matchResult = await dynamoDb.send(new GetCommand({
      TableName: gameStateTable,
      Key: { match_id: matchId },
      ConsistentRead: true
    }));
    const match = matchResult.Item;

    if (!match) {
      await dynamoDb.send(new UpdateCommand({
        TableName: connectionsTable,
        Key: { connection_id: connectionId },
        UpdateExpression: "REMOVE match_id"
      }));
      return { statusCode: 200, body: JSON.stringify({ message: "Stale matchmaking request cleared." }) };
    }

    if (match.status !== "WAITING") {
      return {
        statusCode: 409,
        body: JSON.stringify({ error: "A live match cannot be cancelled. Use game-surrender to leave it." })
      };
    }

    if (match.player_1?.connection_id !== connectionId) {
      return { statusCode: 403, body: JSON.stringify({ error: "This connection does not own the matchmaking request." }) };
    }

    try {
      await dynamoDb.send(new DeleteCommand({
        TableName: gameStateTable,
        Key: { match_id: matchId },
        ConditionExpression: "#status = :waiting AND player_1.connection_id = :connectionId",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":waiting": "WAITING", ":connectionId": connectionId }
      }));
    } catch (error: any) {
      if (error?.name !== "ConditionalCheckFailedException") throw error;
      return { statusCode: 409, body: JSON.stringify({ error: "The match status changed; refresh the game." }) };
    }

    await dynamoDb.send(new UpdateCommand({
      TableName: connectionsTable,
      Key: { connection_id: connectionId },
      UpdateExpression: "REMOVE match_id"
    }));

    // The database operation is already complete. A stale WebSocket must not turn it into a 500.
    try {
      const wsClient = new ApiGatewayManagementApiClient({ endpoint: endpoint(event), region });
      await wsClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ event: "matchmaking:cancelled", roomCode: matchId }))
      }));
    } catch (error) {
      if (!isGone(error)) console.error("Unable to send cancellation acknowledgement:", error);
    }

    return { statusCode: 200, body: JSON.stringify({ message: "Matchmaking cancelled.", matchId }) };
  } catch (error: any) {
    console.error("CancelMatch Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error?.message || "Unable to cancel matchmaking." }) };
  }
};
