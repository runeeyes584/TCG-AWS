import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { applyAction, createInitialGameState } from "../../game/core/engine";
import type { GameState } from "../../game/types";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn(),
  scheduleTurnTimeout: vi.fn(),
  enqueueMatchResult: vi.fn()
}));

vi.mock("../config/dynamodb", () => ({
  dynamoDb: { send: mocks.dynamoSend }
}));

vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class {
    send = mocks.websocketSend;
  },
  PostToConnectionCommand: class {
    constructor(public input: unknown) {}
  }
}));

vi.mock("./turnTimeoutScheduler", () => ({
  scheduleTurnTimeout: mocks.scheduleTurnTimeout
}));

vi.mock("./matchResultQueue", () => ({
  enqueueMatchResult: mocks.enqueueMatchResult
}));

import { handler, turnHasExpired } from "../processGameEngine";

function startedState(turnStartTime: number): GameState {
  const state = applyAction(createInitialGameState([], [], 1), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.turnStartTime = turnStartTime;
  state.turnDuration = 30_000;
  state.winnerId = undefined;
  return state;
}

function event(matchId: string, connectionId: string, action: unknown) {
  return {
    requestContext: {
      connectionId,
      domainName: "socket.example",
      stage: "dev"
    },
    body: JSON.stringify({ matchId, action })
  };
}

describe("processGameEngine real-time timeout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.websocketSend.mockResolvedValue({});
    mocks.scheduleTurnTimeout.mockResolvedValue(undefined);
    mocks.enqueueMatchResult.mockResolvedValue(false);
  });

  it("accepts an expired timeout from the priority player and broadcasts the committed state", async () => {
    const match = {
      match_id: "match-timeout",
      status: "IN_PROGRESS" as const,
      state_version: 4,
      engine_state: startedState(Date.now() - 30_000),
      player_1: { connection_id: "connection-p1", connected: true },
      player_2: { connection_id: "connection-p2", connected: true }
    };
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      if (command instanceof UpdateCommand || command instanceof PutCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler(event(match.match_id, "connection-p1", {
      type: "TIME_OUT",
      playerId: "P1"
    }));

    expect(result.statusCode).toBe(200);
    const update = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof UpdateCommand) as UpdateCommand;
    const nextState = update.input.ExpressionAttributeValues?.[":state"] as GameState;
    expect(nextState.players.P1.consecutiveAfkCount).toBe(1);
    expect(nextState.priorityPlayerId).toBe("P2");
    expect(mocks.websocketSend).toHaveBeenCalledTimes(2);
    expect(mocks.scheduleTurnTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not allow the non-priority player to trigger a timeout", async () => {
    const match = {
      match_id: "match-timeout-auth",
      status: "IN_PROGRESS" as const,
      state_version: 1,
      engine_state: startedState(Date.now() - 30_000),
      player_1: { connection_id: "connection-p1", connected: true },
      player_2: { connection_id: "connection-p2", connected: true }
    };
    mocks.dynamoSend.mockResolvedValue({ Item: match });

    const result = await handler(event(match.match_id, "connection-p2", {
      type: "TIME_OUT",
      playerId: "P2"
    }));

    expect(result.statusCode).toBe(409);
    expect(result.body).toContain("priority player");
    expect(mocks.dynamoSend).toHaveBeenCalledTimes(1);
    expect(mocks.scheduleTurnTimeout).not.toHaveBeenCalled();
  });

  it("allows a small client/server clock skew but rejects an early timeout", () => {
    const deadline = Date.now() + 30_000;
    const state = startedState(deadline - 30_000);

    expect(turnHasExpired(state, deadline - 1_000)).toBe(true);
    expect(turnHasExpired(state, deadline - 2_001)).toBe(false);
  });
});
