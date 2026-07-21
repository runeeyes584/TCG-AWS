import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ApiGatewayManagementApiClient, PostToConnectionCommand } from "@aws-sdk/client-apigatewaymanagementapi";
import { dynamoDb } from "../config/dynamodb";
import { applyAction } from "../game/core/engine";
import { GameState as EngineGameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || "ap-southeast-1";

export const handler = async (event: any) => {
  const connectionId = event.requestContext?.connectionId;
  const callbackUrl = event.requestContext?.domainName && event.requestContext?.stage
    ? `https://${event.requestContext.domainName}/${event.requestContext.stage}`
    : null;

  const wsClient = callbackUrl ? new ApiGatewayManagementApiClient({ endpoint: callbackUrl, region }) : null;

  const body = typeof event.body === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  const matchId = body.matchId || event.matchId;
  const playerId = (body.playerId || event.playerId) as PlayerId;

  if (!matchId || !playerId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing matchId or playerId for timeout." }) };
  }

  try {
    // 1. Lấy thông tin trận đấu từ DynamoDB
    const result = await dynamoDb.send(
      new GetCommand({
        TableName: "GameState",
        Key: { match_id: matchId }
      })
    );

    const match = result.Item;
    if (!match || match.status !== "IN_PROGRESS") {
      return { statusCode: 404, body: JSON.stringify({ message: "Match not active or not found." }) };
    }

    // 2. Gọi Game Engine thực thi hành động TIME_OUT
    let newEngineState: EngineGameState;
    try {
      newEngineState = applyAction(match.engine_state, { type: "TIME_OUT", playerId });
    } catch (err: any) {
      console.error("Timeout execution failed:", err);
      return { statusCode: 400, body: JSON.stringify({ error: err.message }) };
    }

    const isFinished = !!newEngineState.winnerId;

    // 3. Cập nhật GameState mới vào DynamoDB
    await dynamoDb.send(
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

    // 4. Ghi nhật ký vào GameLogs
    await dynamoDb.send(
      new PutCommand({
        TableName: "GameLogs",
        Item: {
          match_id: matchId,
          action_sequence: Date.now(),
          actor_id: playerId,
          action_type: "TIME_OUT",
          details: { playerId, round: newEngineState.round },
          timestamp: Date.now()
        }
      })
    );

    // 5. Gửi thông báo room:update cho cả 2 người chơi nếu WebSocket active
    const p1Conn = match.player_1?.connection_id;
    const p2Conn = match.player_2?.connection_id;

    if (wsClient) {
      const stateForP1 = redactStateForPlayer(newEngineState, "P1");
      const stateForP2 = redactStateForPlayer(newEngineState, "P2");

      const promises = [];
      if (p1Conn) {
        promises.push(
          wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: p1Conn,
              Data: Buffer.from(JSON.stringify({ event: "room:update", roomCode: matchId, playerId: "P1", opponentConnected: true, state: stateForP1 }))
            })
          )
        );
      }
      if (p2Conn) {
        promises.push(
          wsClient.send(
            new PostToConnectionCommand({
              ConnectionId: p2Conn,
              Data: Buffer.from(JSON.stringify({ event: "room:update", roomCode: matchId, playerId: "P2", opponentConnected: true, state: stateForP2 }))
            })
          )
        );
      }
      await Promise.allSettled(promises);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Timeout processed.", matchId, winnerId: newEngineState.winnerId })
    };
  } catch (error: any) {
    console.error("HandleTimeout Lambda Error:", error);
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
