import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";

import { applyAction } from "../game/core/engine";
import { GameAction, GameState as EngineGameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || "ap-southeast-1";
const docClient = dynamoDb;

export const handler = async (event: any) => {
  const connectionId = event.requestContext.connectionId;
  const callbackUrl = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  const wsClient = new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region });

  const body = JSON.parse(event.body || "{}");
  const { matchId, action } = body as { matchId: string; action: GameAction };

  if (!matchId || !action) {
    return { statusCode: 400, body: "Missing matchId or action." };
  }

  try {
    // 1. Tải dữ liệu trận đấu từ DynamoDB
    const result = await docClient.send(
      new GetCommand({
        TableName: "GameState",
        Key: { match_id: matchId }
      })
    );

    const match = result.Item;
    if (!match || match.status !== "IN_PROGRESS") {
      await sendError(wsClient, connectionId, "Match not found or not active.");
      return { statusCode: 404, body: "Match not found." };
    }

    // 2. Xác định vai trò người gửi (P1 / P2)
    let senderPlayerId: PlayerId | null = null;
    if (match.player_1?.connection_id === connectionId) senderPlayerId = "P1";
    else if (match.player_2?.connection_id === connectionId) senderPlayerId = "P2";

    if (!senderPlayerId) {
      await sendError(wsClient, connectionId, "Unauthorized player.");
      return { statusCode: 403, body: "Unauthorized." };
    }

    // 3. Xử lý nước đi qua Game Engine
    let newEngineState: EngineGameState;
    try {
      newEngineState = applyAction(match.engine_state, action);
    } catch (err: any) {
      await sendError(wsClient, connectionId, err.message || "Invalid game action.");
      return { statusCode: 400, body: err.message };
    }

    // 4. Lưu trạng thái mới vào DynamoDB
    const isFinished = !!newEngineState.winnerId;
    await docClient.send(
      new UpdateCommand({
        TableName: "GameState",
        Key: { match_id: matchId },
        UpdateExpression: "SET engine_state = :es, #status = :st, current_round = :rnd",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":es": newEngineState,
          ":st": isFinished ? "FINISHED" : "IN_PROGRESS",
          ":rnd": newEngineState.round
        }
      })
    );

    // 5. Ghi Log vào bảng GameLogs
    await docClient.send(
      new PutCommand({
        TableName: "GameLogs",
        Item: {
          match_id: matchId,
          action_sequence: Date.now(),
          actor_id: senderPlayerId,
          action_type: action.type,
          details: action,
          timestamp: Date.now()
        }
      })
    );

    // 6. Push trạng thái tới cả 2 người chơi (bài đối thủ được che tự động)
    const p1Conn = match.player_1.connection_id;
    const p2Conn = match.player_2.connection_id;

    const stateForP1 = redactStateForPlayer(newEngineState, "P1");
    const stateForP2 = redactStateForPlayer(newEngineState, "P2");

    await Promise.all([
      wsClient.send(new PostToConnectionCommand({
        ConnectionId: p1Conn,
        Data: Buffer.from(JSON.stringify({ event: "room:update", roomCode: matchId, playerId: "P1", opponentConnected: true, state: stateForP1 }))
      })),
      wsClient.send(new PostToConnectionCommand({
        ConnectionId: p2Conn,
        Data: Buffer.from(JSON.stringify({ event: "room:update", roomCode: matchId, playerId: "P2", opponentConnected: true, state: stateForP2 }))
      }))
    ]);

    return { statusCode: 200, body: "Success." };
  } catch (error: any) {
    console.error("ProcessGameEngine Error:", error);
    return { statusCode: 500, body: error.message };
  }
};

async function sendError(client: ApiGatewayManagementApiClient, connectionId: string, message: string) {
  try {
    await client.send(
      new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(JSON.stringify({ event: "game:error", message }))
      })
    );
  } catch (e) {
    console.error("Failed to send error:", e);
  }
}

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
