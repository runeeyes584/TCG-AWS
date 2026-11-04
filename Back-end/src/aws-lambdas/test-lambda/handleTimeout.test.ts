import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createInitialGameState } from "../../game/core/engine";
import { ACTION_LATE_TOLERANCE_MS } from "../../game/rules/turnClock";
import type { GameState } from "../../game/types";
import {
  duePlayer,
  handler,
  normalizeTurnTimeoutMessage,
  timeoutMessageMatches,
  type MatchRecord
} from "../handleTimeout";
import { buildTurnTimeoutMessage } from "../turnTimeoutScheduler";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  wsSend: vi.fn(),
  schedulerSend: vi.fn(),
  sqsSend: vi.fn()
}));

vi.mock("../../config/dynamodb", () => ({
  dynamoDb: { send: mocks.dynamoSend }
}));

vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class {
    send = mocks.wsSend;
  },
  PostToConnectionCommand: class {
    constructor(public input: unknown) {}
  }
}));

vi.mock("@aws-sdk/client-scheduler", () => ({
  SchedulerClient: class {
    send = mocks.schedulerSend;
  },
  CreateScheduleCommand: class {
    constructor(public input: unknown) {}
  },
  UpdateScheduleCommand: class {
    constructor(public input: unknown) {}
  },
  DeleteScheduleCommand: class {
    constructor(public input: unknown) {}
  }
}));

vi.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: class {
    send = mocks.sqsSend;
  },
  SendMessageCommand: class {
    constructor(public input: unknown) {}
  }
}));

function createStartedState(turnStartTime = 1_000, duration = 30_000): GameState {
  const state = applyAction(createInitialGameState([], [], 1), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.players.P1.nexusHp = 20;
  state.players.P2.nexusHp = 20;
  state.winnerId = undefined;
  state.turnStartTime = turnStartTime;
  state.turnDuration = duration;
  return state;
}

describe("handleTimeout EventBridge integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TURN_TIMEOUT_SCHEDULER_GROUP = "default";
    process.env.TURN_TIMEOUT_SCHEDULER_ROLE_ARN =
      "arn:aws:iam::977233000065:role/Amz_EB_Scheduler_TURN_TIMEOUT";
    process.env.HANDLE_TIMEOUT_LAMBDA_ARN =
      "arn:aws:lambda:ap-southeast-1:977233000065:function:HandleTimeout-function";
    process.env.WS_MANAGEMENT_ENDPOINT = "https://ws.example.com";
    mocks.dynamoSend.mockResolvedValue({});
    mocks.wsSend.mockResolvedValue({});
    mocks.schedulerSend.mockResolvedValue({});
    mocks.sqsSend.mockResolvedValue({});
  });

  it("ends a turn only once actions are no longer accepted, so a late click is not taken from the player", () => {
    const match: MatchRecord = { match_id: "match-1", status: "IN_PROGRESS", engine_state: createStartedState(1_000) };
    const deadline = 31_000;

    expect(duePlayer(match, deadline)).toBeUndefined();
    expect(duePlayer(match, deadline + ACTION_LATE_TOLERANCE_MS - 1)).toBeUndefined();
    expect(duePlayer(match, deadline + ACTION_LATE_TOLERANCE_MS)).toBe("P1");
  });

  it("normalizes direct JSON event payload", () => {
    const payload = {
      matchId: "match-123",
      stateVersion: 2,
      expectedPlayerId: "P1",
      turnStartTime: 1000,
      turnDuration: 30000,
      deadline: 31000
    };
    expect(normalizeTurnTimeoutMessage(payload)).toEqual(payload);
  });

  it("normalizes string JSON event payload", () => {
    const payload = {
      matchId: "match-123",
      stateVersion: 2,
      expectedPlayerId: "P1",
      turnStartTime: 1000,
      turnDuration: 30000,
      deadline: 31000
    };
    expect(normalizeTurnTimeoutMessage(JSON.stringify(payload))).toEqual(payload);
  });

  it("normalizes wrapped EventBridge detail payload", () => {
    const payload = {
      matchId: "match-123",
      stateVersion: 2,
      expectedPlayerId: "P1",
      turnStartTime: 1000,
      turnDuration: 30000,
      deadline: 31000
    };
    expect(normalizeTurnTimeoutMessage({ detail: payload })).toEqual(payload);
  });

  it("throws error on invalid payload", () => {
    expect(() => normalizeTurnTimeoutMessage({})).toThrow("Invalid turn-timeout payload");
  });

  it("rejects stale timeout message when state version has advanced", () => {
    const state = createStartedState(1000);
    const match: MatchRecord = {
      match_id: "match-123",
      status: "IN_PROGRESS",
      state_version: 5,
      engine_state: state
    };
    const message = {
      matchId: "match-123",
      stateVersion: 4, // Stale version
      expectedPlayerId: "P1" as const,
      turnStartTime: 1000,
      turnDuration: 30000,
      deadline: 31000
    };
    expect(timeoutMessageMatches(match, message)).toBe(false);
  });

  it("processes timeout and transitions turn when valid", async () => {
    const state = createStartedState(1000);
    const match: MatchRecord = {
      match_id: "match-123",
      status: "IN_PROGRESS",
      state_version: 1,
      engine_state: state,
      player_1: { connection_id: "conn-1", connected: true },
      player_2: { connection_id: "conn-2", connected: true }
    };

    mocks.dynamoSend.mockImplementation(async (command: any) => {
      if (command?.input?.TableName === "GameState" && command?.input?.Key) {
        return { Item: match };
      }
      return {};
    });

    const result = await handler({
      matchId: "match-123",
      stateVersion: 1,
      expectedPlayerId: "P1",
      turnStartTime: 1000,
      turnDuration: 30000,
      deadline: 31000
    });

    expect(result.statusCode).toBe(200);
    // The turn moved on: the state was written, both players were told, and the match's one schedule was
    // pointed at the next turn (updated, not created).
    const update = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command?.input?.UpdateExpression) as any;
    expect(update.input.ExpressionAttributeValues[":nextVersion"]).toBe(2);
    expect(mocks.wsSend).toHaveBeenCalledTimes(2);
    expect(mocks.schedulerSend).toHaveBeenCalledTimes(1);
    const schedule = mocks.schedulerSend.mock.calls[0][0] as { constructor: { name: string }; input: any };
    expect(schedule.input.Name).toBe("turn-match-123");
    expect(JSON.parse(schedule.input.Target.Input).stateVersion).toBe(2);
  });

  const timedOutMatch = (patch: Partial<MatchRecord> = {}): MatchRecord => ({
    match_id: "match-123",
    status: "IN_PROGRESS",
    state_version: 1,
    engine_state: createStartedState(1000),
    player_1: { connection_id: "conn-1", connected: true },
    player_2: { connection_id: "conn-2", connected: true },
    ...patch
  });
  const firedMessage = {
    matchId: "match-123",
    stateVersion: 1,
    expectedPlayerId: "P1",
    turnStartTime: 1000,
    turnDuration: 30000,
    deadline: 31000
  };
  const serve = (match?: MatchRecord) =>
    mocks.dynamoSend.mockImplementation(async (command: any) =>
      command?.input?.TableName === "GameState" && command?.input?.Key && !command?.input?.UpdateExpression
        ? { Item: match }
        : {}
    );
  const schedulerCalls = () =>
    mocks.schedulerSend.mock.calls.map(([command]) => ({ name: command.constructor.name, input: command.input }));

  it("sets the schedule again for the real turn when the one that fired is out of date", async () => {
    // The match is on version 5, a later turn: the schedule that fired was set for version 1.
    const match = timedOutMatch({ state_version: 5, engine_state: createStartedState(Date.now() + 20_000) });
    serve(match);

    const result = await handler(firedMessage);

    expect(result.statusCode).toBe(200);
    const wrote = mocks.dynamoSend.mock.calls.some(([command]) => command?.input?.UpdateExpression);
    expect(wrote).toBe(false);
    expect(mocks.wsSend).not.toHaveBeenCalled();
    const [call] = schedulerCalls();
    expect(call.name).toBe("UpdateScheduleCommand");
    expect(JSON.parse(call.input.Target.Input).stateVersion).toBe(5);
  });

  it("removes the schedule of a match that is over, and does nothing else", async () => {
    serve(timedOutMatch({ status: "FINISHED" }));

    await handler(firedMessage);

    expect(schedulerCalls().map((call) => call.name)).toEqual(["DeleteScheduleCommand"]);
    expect(mocks.wsSend).not.toHaveBeenCalled();
  });

  it("removes the schedule of a match that no longer exists", async () => {
    serve(undefined);

    await handler(firedMessage);

    expect(schedulerCalls().map((call) => call.name)).toEqual(["DeleteScheduleCommand"]);
  });

  it("sets no schedule when it lost the write to a player's report", async () => {
    serve(timedOutMatch());
    mocks.dynamoSend.mockImplementation(async (command: any) => {
      if (command?.input?.UpdateExpression) {
        throw Object.assign(new Error("changed"), { name: "ConditionalCheckFailedException" });
      }
      return { Item: timedOutMatch() };
    });

    const result = await handler(firedMessage);

    expect(result.statusCode).toBe(200);
    expect(mocks.schedulerSend).not.toHaveBeenCalled();
    expect(mocks.wsSend).not.toHaveBeenCalled();
  });
});
