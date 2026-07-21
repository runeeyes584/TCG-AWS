import { DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";

const region = process.env.AWS_REGION || "ap-southeast-1";

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const callbackUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region });

  try {
    const connectionResult = await dynamoDb.send(
      new GetCommand({ TableName: "Connections", Key: { connection_id: connectionId } })
    );
    const matchId = connectionResult.Item?.match_id as string | undefined;

    if (matchId) {
      const matchResult = await dynamoDb.send(
        new GetCommand({ TableName: "GameState", Key: { match_id: matchId } })
      );
      const match = matchResult.Item;

      if (match?.status === "WAITING" && match.player_1?.connection_id === connectionId) {
        await dynamoDb.send(
          new DeleteCommand({
            TableName: "GameState",
            Key: { match_id: matchId },
            ConditionExpression: "#status = :waiting AND player_1.connection_id = :connectionId",
            ExpressionAttributeNames: { "#status": "status" },
            ExpressionAttributeValues: {
              ":waiting": "WAITING",
              ":connectionId": connectionId
            }
          })
        );
      }

      await dynamoDb.send(
        new UpdateCommand({
          TableName: "Connections",
          Key: { connection_id: connectionId },
          UpdateExpression: "REMOVE match_id"
        })
      );
    }

    await wsClient.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ event: "matchmaking:cancelled" }))
      })
    );

    return { statusCode: 200, body: "Matchmaking cancelled." };
  } catch (error: any) {
    console.error("CancelMatch Error:", error);
    return { statusCode: 500, body: error.message };
  }
};
