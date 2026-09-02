import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createInitialGameState } from "../game/core/engine";

const mocks = vi.hoisted(() => ({ schedulerSend: vi.fn() }));

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

import {
  classifyTurnTimeoutError,
  sanitizeScheduleName,
  scheduleTurnTimeout
} from "./turnTimeoutScheduler";

function startedState() {
  const state = applyAction(createInitialGameState([], [], 1), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.winnerId = undefined;
  state.turnStartTime = Date.now() + 30_000;
  state.turnDuration = 30_000;
  return state;
}

describe("turn timeout Scheduler configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TURN_TIMEOUT_SCHEDULER_GROUP = "default";
    process.env.TURN_TIMEOUT_SCHEDULER_ROLE_ARN =
      "arn:aws:iam::977233000065:role/Amz_EB_Scheduler_TURN_TIMEOUT";
    process.env.HANDLE_TIMEOUT_LAMBDA_ARN =
      "arn:aws:lambda:ap-southeast-1:977233000065:function:HandleTimeout-function";
    delete process.env.TURN_TIMEOUT_SCHEDULER_DLQ_ARN;
    mocks.schedulerSend.mockResolvedValue({});
  });

  it("passes the normalized production role, target and group to Scheduler", async () => {
    await scheduleTurnTimeout({
      matchId: "match-config",
      state: startedState(),
      stateVersion: 1
    });

    expect(mocks.schedulerSend).toHaveBeenCalledTimes(1);
    const command = mocks.schedulerSend.mock.calls[0]?.[0] as { input: Record<string, any> };
    expect(command.input.GroupName).toBe("default");
    expect(command.input.Target.RoleArn).toBe(
      "arn:aws:iam::977233000065:role/Amz_EB_Scheduler_TURN_TIMEOUT"
    );
    expect(command.input.Target.Arn).toBe(
      "arn:aws:lambda:ap-southeast-1:977233000065:function:HandleTimeout-function"
    );
    expect(command.input.Target.RetryPolicy).toEqual({
      MaximumEventAgeInSeconds: 300,
      MaximumRetryAttempts: 2
    });
  });

  it("fails before the AWS call when a required ARN is missing or malformed", async () => {
    delete process.env.TURN_TIMEOUT_SCHEDULER_ROLE_ARN;
    await expect(scheduleTurnTimeout({
      matchId: "match-config",
      state: startedState(),
      stateVersion: 1
    })).rejects.toThrow("Missing TURN_TIMEOUT_SCHEDULER_ROLE_ARN");
    expect(mocks.schedulerSend).not.toHaveBeenCalled();

    process.env.TURN_TIMEOUT_SCHEDULER_ROLE_ARN = "not-an-arn";
    await expect(scheduleTurnTimeout({
      matchId: "match-config",
      state: startedState(),
      stateVersion: 1
    })).rejects.toThrow("Invalid TURN_TIMEOUT_SCHEDULER_ROLE_ARN");
    expect(mocks.schedulerSend).not.toHaveBeenCalled();
  });

  it("classifies the AWS assume-role error without exposing credentials", () => {
    expect(classifyTurnTimeoutError({
      name: "ValidationException",
      message: "The execution role you provide must allow AWS EventBridge Scheduler to assume the role."
    })).toBe("ROLE_ASSUME");
    expect(classifyTurnTimeoutError({
      name: "AccessDeniedException",
      message: "User is not authorized to perform iam:PassRole"
    })).toBe("IAM_DENIED");
  });

  it("sanitizes long match IDs to always start with turn- and stay under 64 chars", () => {
    const longMatchId = "MATCH_1788344944547_c7196c20-e189-47c7-a969-95fbcb0ca8d1";
    const name = sanitizeScheduleName(longMatchId, 1);
    expect(name.startsWith("turn-")).toBe(true);
    expect(name.endsWith("-v1")).toBe(true);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(/^[0-9a-zA-Z-_.]+$/.test(name)).toBe(true);
  });
});
