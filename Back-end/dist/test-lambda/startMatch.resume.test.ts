import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../../src/game/core/engine";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn()
}));

vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = mocks.websocketSend; },
  GetConnectionCommand: class { constructor(public input: any) {} },
  PostToConnectionCommand: class { constructor(public input: any) {} }
}));

import { handler } from "../../src/aws-lambdas/startMatch";

describe("startMatch active-match recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.websocketSend.mockResolvedValue({});
  });

  it("restores the authoritative state after an explicit matching resume request", async () => {
    const state = createInitialGameState([], []);
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) {
        if (command.input.TableName === "Connections") {
          return {
            Item: {
              connection_id: "new-connection",
              user_id: "user-p1",
              username: "Player One",
              match_id: "VL7S9V"
            }
          };
        }
        return {
          Item: {
            match_id: "VL7S9V",
            status: "IN_PROGRESS",
            engine_state: state,
            player_1: {
              user_id: "user-p1",
              connection_id: "new-connection",
              connected: false
            },
            player_2: {
              user_id: "user-p2",
              connection_id: "opponent-connection",
              connected: true
            }
          }
        };
      }
      if (command instanceof UpdateCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler({
      requestContext: {
        connectionId: "new-connection",
        routeKey: "matchfinding-start",
        domainName: "socket.example",
        stage: "dev"
      },
      body: JSON.stringify({ resume: true, matchId: "VL7S9V" })
    });

    expect(result).toEqual({ statusCode: 200, body: "Active match resumed." });
    const updates = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .filter((command) => command instanceof UpdateCommand) as UpdateCommand[];
    expect(updates[0].input.ConditionExpression).toContain("player_1.connection_id = :connectionId");
    expect(updates[0].input.UpdateExpression).toContain("player_1.connected = :connected");
    expect(updates[1].input.UpdateExpression).toBe("REMOVE resume_required");

    const playerPayload = JSON.parse(mocks.websocketSend.mock.calls[0][0].input.Data.toString());
    expect(playerPayload).toMatchObject({
      event: "matchmaking:found",
      roomCode: "VL7S9V",
      playerId: "P1"
    });
  });

  it("rejects a resume request for a different match", async () => {
    const state = createInitialGameState([], []);
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand && command.input.TableName === "Connections") {
        return {
          Item: {
            connection_id: "new-connection",
            user_id: "user-p1",
            match_id: "VL7S9V"
          }
        };
      }
      if (command instanceof GetCommand) {
        return {
          Item: {
            match_id: "VL7S9V",
            status: "IN_PROGRESS",
            engine_state: state,
            player_1: { user_id: "user-p1", connection_id: "new-connection" },
            player_2: { user_id: "user-p2", connection_id: "opponent-connection" }
          }
        };
      }
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler({
      requestContext: {
        connectionId: "new-connection",
        routeKey: "matchfinding-start",
        domainName: "socket.example",
        stage: "dev"
      },
      body: JSON.stringify({ resume: true, matchId: "OTHER-MATCH" })
    });

    expect(result.statusCode).toBe(409);
    expect(result.body).toContain("no longer associated");
    expect(mocks.dynamoSend.mock.calls.some(([command]) => command instanceof UpdateCommand)).toBe(false);
  });
});
