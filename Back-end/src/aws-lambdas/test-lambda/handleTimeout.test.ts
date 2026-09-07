import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createInitialGameState } from "../../game/core/engine";
import type { GameState } from "../../game/types";
import {
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

vi.mock("../config/dynamodb", () => ({
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

    const now = 32000;
    const result = await handler({
      matchId: "match-123",
      stateVersion: 1,
      expectedPlayerId: "P1",
      turnStartTime: 1000,
      turnDuration: 30000,
      deadline: 31000
    });

    expect(result.statusCode).toBe(200);
    // Verified that DynamoDB was called for Get and Update
    expect(mocks.dynamoSend).toHaveBeenCalled();
    // Verified WebSocket broadcast was sent
    expect(mocks.wsSend).toHaveBeenCalled();
    // Verified next turn timeout was scheduled via EventBridge Scheduler
    expect(mocks.schedulerSend).toHaveBeenCalled();
  });
});
