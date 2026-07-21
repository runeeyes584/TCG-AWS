import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import { GameState as EngineGameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || "ap-southeast-1";

export interface EndMatchPayload {
  matchId: string;
  reason?: "SURRENDER" | "NEXUS_DESTROYED" | "FORFEIT" | string;
}

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId;
  const callbackUrl = event.requestContext?.domainName && event.requestContext?.stage
    ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    : null;

  const wsClient = callbackUrl ? new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region }) : null;

  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  const matchId = body.matchId || event.matchId;
  const reason = body.reason || "SURRENDER";

  if (!matchId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing matchId parameter." }) };
  }

  try {
    // 1. Đọc GameState từ DynamoDB
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: "GameState",
        Key: { match_id: matchId }
      })
    );

    const match = result.Item;
    if (!match) {
      return { statusCode: 404, body: JSON.stringify({ error: "Match not found." }) };
    }

    // Xác định player thực hiện lệnh kết thúc (nếu có connectionId)
    let requestingPlayerId: PlayerId | null = null;
    if (match.player_1?.connection_id === connectionId) requestingPlayerId = "P1";
    else if (match.player_2?.connection_id === connectionId) requestingPlayerId = "P2";

    let finalEngineState: EngineGameState = match.engine_state;

    // 2. Nếu trận đấu chưa kết thúc và lý do là đầu hàng (SURRENDER)
    if (match.status !== "FINISHED" && reason === "SURRENDER" && requestingPlayerId) {
      try {
        finalEngineState = applyAction(match.engine_state, { type: "SURRENDER", playerId: requestingPlayerId });
      } catch (e) {
        console.warn("Surrender action warning:", e);
      }
    }

    const winnerId = finalEngineState.winnerId || (requestingPlayerId ? (requestingPlayerId === "P1" ? "P2" : "P1") : undefined);

    // 3. Cập nhật trạng thái trận đấu thành FINISHED trong DynamoDB
    await dynamoDb.send(
      new UpdateCommand({
        TableName: "GameState",
        Key: { match_id: matchId },
        UpdateExpression: "SET #status = :finishedStatus, engine_state = :es, winner_id = :wId",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":finishedStatus": "FINISHED",
          ":es": finalEngineState,
          ":wId": winnerId || null
        }
      })
    );

    // 4. Ghi nhật ký kết thúc vào GameLogs
    await dynamoDb.send(
      new PutCommand({
        TableName: "GameLogs",
        Item: {
          match_id: matchId,
          action_sequence: Date.now(),
          actor_id: requestingPlayerId || "SYSTEM",
          action_type: "END_MATCH",
          details: { reason, winnerId },
          timestamp: Date.now()
        }
      })
    );

    // 4b. Gửi kết quả trận đấu vào AWS SQS Queue cho PostMatchWorker xử lý bất đồng bộ
    const sqsQueueUrl = process.env.SQS_MATCH_RESULTS_QUEUE_URL;
    if (sqsQueueUrl) {
      if (match.player_1?.user_id && match.player_2?.user_id) {
        try {
          console.log(`[SQS] Đang gửi kết quả trận đấu ${matchId} vào SQS Queue: ${sqsQueueUrl}...`);
          const { SQSClient, SendMessageCommand } = await import("@aws-sdk/client-sqs");
          const sqsClient = new SQSClient({ region });
          await sqsClient.send(
            new SendMessageCommand({
              QueueUrl: sqsQueueUrl,
              MessageBody: JSON.stringify({
                matchId,
                winnerId,
                reason,
                endedAt: Date.now(),
                player1: { userId: match.player_1.user_id },
                player2: { userId: match.player_2.user_id }
              })
            })
          );
          console.log(`[SQS] Đã gửi kết quả trận đấu ${matchId} vào SQS Queue thành công!`);
        } catch (sqsErr) {
          console.error("[SQS] Lỗi khi gửi tin nhắn vào SQS:", sqsErr);
        }
      } else {
        console.warn(`[SQS] Bỏ qua SQS vì trận đấu ${matchId} chưa đủ 2 người chơi (P1: ${match.player_1?.user_id}, P2: ${match.player_2?.user_id}).`);
      }
    } else {
      console.warn("[SQS] Chưa cấu hình biến môi trường SQS_MATCH_RESULTS_QUEUE_URL.");
    }

    // 5. Gửi thông báo kết thúc trận đấu cho 2 người chơi
    const p1Conn = match.player_1?.connection_id;
    const p2Conn = match.player_2?.connection_id;

    if (wsClient) {
      const stateForP1 = redactStateForPlayer(finalEngineState, "P1");
      const stateForP2 = redactStateForPlayer(finalEngineState, "P2");

      const endPayloadP1 = { event: "match:ended", roomCode: matchId, winnerId, reason, state: stateForP1 };
      const endPayloadP2 = { event: "match:ended", roomCode: matchId, winnerId, reason, state: stateForP2 };

      const promises = [];
      if (p1Conn) {
        promises.push(
          wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: p1Conn,
              Data: Buffer.from(JSON.stringify(endPayloadP1))
            })
          )
        );
      }
      if (p2Conn) {
        promises.push(
          wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: p2Conn,
              Data: Buffer.from(JSON.stringify(endPayloadP2))
            })
          )
        );
      }
      await Promise.allSettled(promises);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Match ended successfully.",
        matchId,
        winnerId,
        reason
      })
    };
  } catch (error: any) {
    console.error("EndMatch Lambda Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

function redactStateForPlayer(state: EngineGameState, viewerId: PlayerId): EngineGameState {
  const visibleState = structuredClone(state);
  const opponentId: PlayerId = viewerId === "P1" ? "P2" : "P1";
  const opponent = visibleState.players[opponentId];

  if (opponent) {
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
  }

  return visibleState;
}
