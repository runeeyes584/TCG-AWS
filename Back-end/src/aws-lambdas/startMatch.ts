import { GetCommand, ScanCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";

// Import trực tiếp từ Game Engine có sẵn trong dự án của bạn
import { createInitialGameState, applyAction } from "../game/core/engine";
import { buildDefaultDeck } from "../game/entities/defaultDeck";
import type { GameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || "ap-southeast-1";
const docClient = dynamoDb;

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const callbackUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region });

  try {
    // Never trust userId supplied by the browser. The authenticated identity was
    // persisted by the $connect Lambda under this API Gateway connection ID.
    const connectionResult = await docClient.send(
      new GetCommand({
        TableName: "Connections",
        Key: { connection_id: connectionId }
      })
    );
    const connection = connectionResult.Item;
    if (!connection?.user_id) {
      return { statusCode: 401, body: "Connection is not authenticated." };
    }
    const userId = connection.user_id as string;
    const username = (connection.username as string | undefined) || "Player";

    // 1. Quét tìm trận đấu ở trạng thái WAITING trong bảng GameState
    const scanResult = await docClient.send(
      new ScanCommand({
        TableName: "GameState",
        FilterExpression: "#status = :waitingStatus",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: { ":waitingStatus": "WAITING" },
      })
    );

    const pendingMatch = scanResult.Items?.[0];

    if (!pendingMatch) {
      // ─── TRƯỜNG HỢP 1: Chưa có phòng chờ -> Tạo trận đấu mới ────────────────
      const matchId = `MATCH_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Tạo GameState ban đầu từ Game Engine
      const initialEngineState = createInitialGameState(
        buildDefaultDeck("P1"),
        buildDefaultDeck("P2"),
        Date.now()
      );

      const newMatchItem = {
        match_id: matchId,
        status: "WAITING",
        current_round: initialEngineState.round,
        turn_player_id: "P1",
        player_1: {
          user_id: userId,
          connection_id: connectionId,
          username: username,
          player_id: "P1"
        },
        player_2: null,
        engine_state: initialEngineState,
        created_at: Date.now(),
        expire_at: Math.floor(Date.now() / 1000) + 2 * 3600 // TTL 2 giờ (tính bằng giây)
      };

      await docClient.send(
        new PutCommand({
          TableName: "GameState",
          Item: newMatchItem
        })
      );

      // Lưu thông tin kết nối
      await docClient.send(
        new PutCommand({
          TableName: "Connections",
          Item: { connection_id: connectionId, user_id: userId, match_id: matchId, connected_at: Date.now() }
        })
      );

      // Gửi WebSocket push báo trạng thái đang chờ đối thủ
      await wsClient.send(
        new PostToConnectionCommand({
          ConnectionId: connectionId,
          Data: Buffer.from(JSON.stringify({ event: "matchmaking:searching", roomCode: matchId }))
        })
      );

      return { statusCode: 200, body: "Waiting for opponent." };
    } else {
      // ─── TRƯỜNG HỢP 2: Đã có phòng chờ -> Ghép Player 2 vào ────────────────
      const matchId = pendingMatch.match_id;

      if (pendingMatch.player_1.user_id === userId) {
        await wsClient.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: Buffer.from(JSON.stringify({ event: "game:error", message: "Already in queue." }))
          })
        );
        return { statusCode: 400, body: "Already in queue." };
      }

      // Khởi chạy action START_GAME qua Game Engine
      let updatedEngineState = applyAction(pendingMatch.engine_state, { type: "START_GAME", firstPlayerId: "P1" });

      const player2Info = {
        user_id: userId,
        connection_id: connectionId,
        username: username,
        player_id: "P2"
      };

      // Đổi trạng thái trận đấu thành IN_PROGRESS trong DynamoDB
      await docClient.send(
        new UpdateCommand({
          TableName: "GameState",
          Key: { match_id: matchId },
          UpdateExpression: "SET #status = :status, player_2 = :p2, engine_state = :engineState",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": "IN_PROGRESS",
            ":p2": player2Info,
            ":engineState": updatedEngineState
          }
        })
      );

      await docClient.send(
        new PutCommand({
          TableName: "Connections",
          Item: { connection_id: connectionId, user_id: userId, match_id: matchId, connected_at: Date.now() }
        })
      );

      // Send WebSocket push thông báo tới cả P1 và P2
      const p1ConnectionId = pendingMatch.player_1.connection_id;
      const p2ConnectionId = connectionId;

      const payloadP1 = {
        event: "matchmaking:found",
        roomCode: matchId,
        playerId: "P1",
        state: redactStateForPlayer(updatedEngineState, "P1")
      };
      const payloadP2 = {
        event: "matchmaking:found",
        roomCode: matchId,
        playerId: "P2",
        state: redactStateForPlayer(updatedEngineState, "P2")
      };

      await Promise.all([
        wsClient.send(new PostToConnectionCommand({ ConnectionId: p1ConnectionId, Data: Buffer.from(JSON.stringify(payloadP1)) })),
        wsClient.send(new PostToConnectionCommand({ ConnectionId: p2ConnectionId, Data: Buffer.from(JSON.stringify(payloadP2)) }))
      ]);

      return { statusCode: 200, body: "Match started." };
    }
  } catch (error: any) {
    console.error("StartMatch Error:", error);
    return { statusCode: 500, body: error.message };
  }
};

function redactStateForPlayer(state: GameState, viewerId: PlayerId): GameState {
  const visibleState = structuredClone(state);
  const opponentId: PlayerId = viewerId === "P1" ? "P2" : "P1";
  const opponent = visibleState.players[opponentId];

  opponent.hand = opponent.hand.map((_, index) => ({
    instanceId: `hidden-hand-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));
  opponent.deck = opponent.deck.map((_, index) => ({
    instanceId: `hidden-deck-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));

  return visibleState;
}
