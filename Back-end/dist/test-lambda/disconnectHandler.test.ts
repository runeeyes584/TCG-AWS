import { DeleteCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../src/game/core/engine";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn()
}));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = mocks.websocketSend; },
  PostToConnectionCommand: class { constructor(public input: any) {} }
}));

import { handler } from "../../src/aws-lambdas/disconnectHandler";

describe("disconnectHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.websocketSend.mockResolvedValue({});
  });

  it("marks the player disconnected and publishes a room update to the opponent", async () => {
    const state = createInitialGameState([], []);
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ScanCommand) {
        return {
          Items: [{
            match_id: "match-active",
            status: "IN_PROGRESS",
            engine_state: state,
            player_1: { connection_id: "connection-p1", connected: true },
            player_2: { connection_id: "connection-p2", connected: true }
          }]
        };
      }
      if (command instanceof UpdateCommand || command instanceof DeleteCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler({
      requestContext: {
        connectionId: "connection-p1",
        domainName: "socket.example",
        stage: "dev"
      }
    });

    expect(result.statusCode).toBe(200);
    const update = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof UpdateCommand) as UpdateCommand;
    expect(update.input.ExpressionAttributeValues).toMatchObject({ ":false": false });
    const payload = JSON.parse(mocks.websocketSend.mock.calls[0][0].input.Data.toString());
    expect(payload).toMatchObject({
      event: "room:update",
      roomCode: "match-active",
      playerId: "P2",
      opponentConnected: false
    });
  });

  it("does not let a stale disconnect overwrite a newer resumed connection", async () => {
    const state = createInitialGameState([], []);
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ScanCommand) {
        return {
          Items: [{
            match_id: "match-active",
            status: "IN_PROGRESS",
            engine_state: state,
            player_1: { connection_id: "old-connection", connected: true },
            player_2: { connection_id: "opponent", connected: true }
          }]
        };
      }
      if (command instanceof UpdateCommand) {
        const error = new Error("connection was rebound");
        error.name = "ConditionalCheckFailedException";
        throw error;
      }
      if (command instanceof DeleteCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler({
      requestContext: {
        connectionId: "old-connection",
        domainName: "socket.example",
        stage: "dev"
      }
    });

    expect(result.statusCode).toBe(200);
    expect(mocks.websocketSend).not.toHaveBeenCalled();
    expect(mocks.dynamoSend.mock.calls.some(([command]) => command instanceof DeleteCommand)).toBe(true);
  });
});
