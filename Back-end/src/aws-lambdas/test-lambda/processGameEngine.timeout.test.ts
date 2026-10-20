import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { applyAction, createInitialGameState } from "../../game/core/engine";
import type { GameState } from "../../game/types";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn(),
  scheduleTurnTimeout: vi.fn(),
  cancelTurnTimeout: vi.fn(),
  enqueueMatchResult: vi.fn()
}));

vi.mock("../../config/dynamodb", () => ({
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

vi.mock("../turnTimeoutScheduler", () => ({
  scheduleTurnTimeout: mocks.scheduleTurnTimeout,
  cancelTurnTimeout: mocks.cancelTurnTimeout
}));

vi.mock("../matchResultQueue", () => ({
  enqueueMatchResult: mocks.enqueueMatchResult
}));

import { handler } from "../processGameEngine";

function startedState(turnStartTime: number): GameState {
  const state = applyAction(createInitialGameState([], [], 1), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.players.P1.nexusHp = 20;
  state.players.P2.nexusHp = 20;
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
    mocks.cancelTurnTimeout.mockResolvedValue(undefined);
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

  const activeMatch = (turnStartTime: number) => ({
    match_id: "match-timeout-claim",
    status: "IN_PROGRESS" as const,
    state_version: 1,
    engine_state: startedState(turnStartTime),
    player_1: { connection_id: "connection-p1", connected: true },
    player_2: { connection_id: "connection-p2", connected: true }
  });
  const serve = (match: ReturnType<typeof activeMatch>) =>
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      return {};
    });
  const writes = () =>
    mocks.dynamoSend.mock.calls.map(([command]) => command).filter((command) => command instanceof UpdateCommand);

  it("lets the opponent report the timeout once the claim delay has passed, and times out the player in turn", async () => {
    // P1 is in turn and has gone; P2 (still here) reports it 2 s after the deadline.
    const match = activeMatch(Date.now() - 32_000);
    serve(match);

    const result = await handler(event(match.match_id, "connection-p2", { type: "TIME_OUT", playerId: "P2" }));

    expect(result.statusCode).toBe(200);
    const nextState = (writes()[0] as UpdateCommand).input.ExpressionAttributeValues?.[":state"] as GameState;
    expect(nextState.players.P1.consecutiveAfkCount).toBe(1);
    expect(nextState.players.P2.consecutiveAfkCount).toBe(0);
    expect(nextState.priorityPlayerId).toBe("P2");
    expect(mocks.scheduleTurnTimeout).toHaveBeenCalledTimes(1);
  });

  it("does not let the opponent report before the claim delay: the player in turn is heard first", async () => {
    const match = activeMatch(Date.now() - 30_500);
    serve(match);

    const result = await handler(event(match.match_id, "connection-p2", { type: "TIME_OUT", playerId: "P2" }));

    expect(result.statusCode).toBe(409);
    expect(writes()).toHaveLength(0);
    expect(mocks.websocketSend).not.toHaveBeenCalled();
    expect(mocks.scheduleTurnTimeout).not.toHaveBeenCalled();
  });

  it("refuses a report from the player in turn before the turn has run out, without telling the player", async () => {
    const match = activeMatch(Date.now() - 5_000);
    serve(match);

    const result = await handler(event(match.match_id, "connection-p1", { type: "TIME_OUT", playerId: "P1" }));

    expect(result.statusCode).toBe(409);
    expect(writes()).toHaveLength(0);
    expect(mocks.websocketSend).not.toHaveBeenCalled();
  });

  it("sets the next schedule only after the state is written, and not at all when the write was lost", async () => {
    const match = activeMatch(Date.now() - 31_000);
    const order: string[] = [];
    mocks.scheduleTurnTimeout.mockImplementation(async () => {
      order.push("schedule");
    });
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      if (command instanceof UpdateCommand) {
        order.push("write");
        return {};
      }
      return {};
    });

    await handler(event(match.match_id, "connection-p1", { type: "TIME_OUT", playerId: "P1" }));
    expect(order).toEqual(["write", "schedule"]);

    // Another report got there first: this request wrote nothing, so it must set no schedule and says nothing.
    vi.clearAllMocks();
    mocks.websocketSend.mockResolvedValue({});
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      if (command instanceof UpdateCommand) {
        throw Object.assign(new Error("changed"), { name: "ConditionalCheckFailedException" });
      }
      return {};
    });

    const lost = await handler(event(match.match_id, "connection-p2", { type: "TIME_OUT", playerId: "P2" }));
    expect(lost.statusCode).toBe(409);
    expect(mocks.scheduleTurnTimeout).not.toHaveBeenCalled();
    expect(mocks.websocketSend).not.toHaveBeenCalled();
  });

  it("removes the schedule instead of setting one when the timeout ends the match", async () => {
    const match = activeMatch(Date.now() - 31_000);
    match.engine_state.players.P1.consecutiveAfkCount = 2;
    serve(match);

    const result = await handler(event(match.match_id, "connection-p1", { type: "TIME_OUT", playerId: "P1" }));

    expect(result.statusCode).toBe(200);
    expect(mocks.scheduleTurnTimeout).not.toHaveBeenCalled();
    expect(mocks.cancelTurnTimeout).toHaveBeenCalledWith(match.match_id);
  });

  it("accepts an action in the last seconds of the turn and shortly after the deadline", async () => {
    // 1 s before the deadline, and 1 s after it (inside the late allowance).
    for (const turnStartTime of [Date.now() - 29_000, Date.now() - 31_000]) {
      vi.clearAllMocks();
      mocks.websocketSend.mockResolvedValue({});
      mocks.scheduleTurnTimeout.mockResolvedValue(undefined);
      const match = activeMatch(turnStartTime);
      serve(match);

      const result = await handler(event(match.match_id, "connection-p1", { type: "END_TURN", playerId: "P1" }));

      expect(result.statusCode).toBe(200);
      expect(writes()).toHaveLength(1);
    }
  });

  it("rejects an action that arrives after the deadline and the late allowance", async () => {
    const match = activeMatch(Date.now() - 32_000);
    serve(match);

    const result = await handler(event(match.match_id, "connection-p1", { type: "END_TURN", playerId: "P1" }));

    expect(result.statusCode).toBe(409);
    expect(writes()).toHaveLength(0);
  });

  it("rejects a timeout reported by the player in turn more than the early allowance before the deadline", async () => {
    const match = activeMatch(Date.now() - 29_000);
    serve(match);

    const result = await handler(event(match.match_id, "connection-p1", { type: "TIME_OUT", playerId: "P1" }));

    expect(result.statusCode).toBe(409);
    expect(writes()).toHaveLength(0);
  });
});
