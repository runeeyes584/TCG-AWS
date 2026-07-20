import { DeleteCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";

const region = process.env.AWS_REGION || "ap-southeast-1";
const docClient = dynamoDb;

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const callbackUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region });

  try {
    // 1. Xóa thông tin kết nối khỏi bảng Connections
    await docClient.send(
      new DeleteCommand({
        TableName: "Connections",
        Key: { connection_id: connectionId }
      })
    );

    // 2. Kiểm tra xem kết nối này có đang tham gia trận đấu nào không
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: "GameState",
        FilterExpression: "(player_1.connection_id = :connId OR player_2.connection_id = :connId) AND #status = :activeStatus",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":connId": connectionId,
          ":activeStatus": "IN_PROGRESS"
        }
      })
    );

    const activeMatch = scanResult.Items?.[0];

    if (activeMatch) {
      const matchId = activeMatch.match_id;
      const isP1 = activeMatch.player_1?.connection_id === connectionId;
      const opponentConnId = isP1 ? activeMatch.player_2?.connection_id : activeMatch.player_1?.connection_id;

      // Cập nhật trạng thái ngắt kết nối của player trong GameState
      const updatePath = isP1 ? "player_1.connected" : "player_2.connected";
      await docClient.send(
        new UpdateCommand({
          TableName: "GameState",
          Key: { match_id: matchId },
          UpdateExpression: `SET ${updatePath} = :connState`,
          ExpressionAttributeValues: { ":connState": false }
        })
      );

      // Thông báo cho đối thủ còn lại trong bàn đấu
      if (opponentConnId) {
        try {
          await wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: opponentConnId,
              Data: Buffer.from(JSON.stringify({ event: "game:error", message: "Opponent has disconnected." }))
            })
          );
        } catch (err) {
          console.error("Failed to notify opponent:", err);
        }
      }
    }

    return { statusCode: 200, body: "Disconnected successfully." };
  } catch (error: any) {
    console.error("Disconnect Lambda Error:", error);
    return { statusCode: 500, body: error.message };
  }
};
