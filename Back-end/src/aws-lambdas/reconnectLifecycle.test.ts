import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  ScanCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../game/core/engine";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  verifyToken: vi.fn(),
  websocketSend: vi.fn()
}));

vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("../auth/verifyToken", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("../config/env", () => ({
  env: {
    region: "ap-southeast-1",
    userPoolId: "ap-southeast-1_pool",
    clientId: "client"
  }
}));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = mocks.websocketSend; },
  PostToConnectionCommand: class { constructor(public input: any) {} }
}));

import { handler as connect } from "./connectHandler";
import { handler as disconnect } from "./disconnectHandler";

describe("completed-match connection lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyToken.mockResolvedValue({ sub: "user-p1", username: "Player One" });
    mocks.websocketSend.mockResolvedValue({});
  });

  it("does not rebind a completed engine state whose top-level status is stale", async () => {
    let scanCount = 0;
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand || command instanceof PutCommand) return {};
      if (command instanceof ScanCommand) {
        scanCount += 1;
        if (scanCount === 1) {
          expect(command.input.FilterExpression).toContain(
            "attribute_not_exists(engine_state.winnerId)"
          );
          return {
            Items: [{
              match_id: "match-finished",
              status: "IN_PROGRESS",
              engine_state: { winnerId: "P1" },
              player_1: { user_id: "user-p1", connection_id: "old-connection" },
              player_2: { user_id: "user-p2", connection_id: "opponent" }
            }]
          };
        }
        return { Items: [] };
      }
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await connect({
      requestContext: { connectionId: "new-connection" },
      queryStringParameters: { token: "valid-token" },
      headers: {},
      isBase64Encoded: false
    } as any);

    expect(result.statusCode).toBe(200);
    expect(mocks.dynamoSend.mock.calls.some(([command]) => command instanceof UpdateCommand)).toBe(false);
  });

  it("does not publish disconnect state after the engine has a winner", async () => {
    const state = createInitialGameState([], []);
    state.winnerId = "P1";
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ScanCommand) {
        expect(command.input.FilterExpression).toContain(
          "attribute_not_exists(engine_state.winnerId)"
        );
        return {
          Items: [{
            match_id: "match-finished",
            status: "IN_PROGRESS",
            engine_state: state,
            player_1: { connection_id: "connection-p1", connected: true },
            player_2: { connection_id: "connection-p2", connected: true }
          }]
        };
      }
      if (command instanceof DeleteCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await disconnect({
      requestContext: {
        connectionId: "connection-p1",
        domainName: "socket.example",
        stage: "dev"
      }
    });

    expect(result.statusCode).toBe(200);
    expect(mocks.websocketSend).not.toHaveBeenCalled();
    expect(mocks.dynamoSend.mock.calls.some(([command]) => command instanceof UpdateCommand)).toBe(false);
  });
});
