import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createInitialGameState } from "../../game/core/engine";

const mocks = vi.hoisted(() => ({ schedulerSend: vi.fn() }));

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

import {
  cancelTurnTimeout,
  classifyTurnTimeoutError,
  formatScheduleExpression,
  sanitizeScheduleName,
  scheduleTurnTimeout
} from "../turnTimeoutScheduler";

const awsError = (name: string) => Object.assign(new Error(name), { name });
const sentCommands = () =>
  mocks.schedulerSend.mock.calls.map(([command]) => ({ name: command.constructor.name, input: command.input }));

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
    const [{ input }] = sentCommands();
    expect(input.GroupName).toBe("default");
    expect(input.Target.RoleArn).toBe(
      "arn:aws:iam::977233000065:role/Amz_EB_Scheduler_TURN_TIMEOUT"
    );
    expect(input.Target.Arn).toBe(
      "arn:aws:lambda:ap-southeast-1:977233000065:function:HandleTimeout-function"
    );
    expect(input.Target.RetryPolicy).toEqual({
      MaximumEventAgeInSeconds: 300,
      MaximumRetryAttempts: 2
    });
  });

  it("keeps one schedule for the whole match, which does not delete itself", async () => {
    await scheduleTurnTimeout({ matchId: "match-config", state: startedState(), stateVersion: 1 });

    const [{ name, input }] = sentCommands();
    expect(name).toBe("UpdateScheduleCommand");
    expect(input.Name).toBe("turn-match-config");
    expect(input.ActionAfterCompletion).toBe("NONE");
  });

  it("creates the schedule only when the match has none yet", async () => {
    mocks.schedulerSend.mockRejectedValueOnce(awsError("ResourceNotFoundException"));

    await scheduleTurnTimeout({ matchId: "match-config", state: startedState(), stateVersion: 1 });

    expect(sentCommands().map((call) => call.name)).toEqual(["UpdateScheduleCommand", "CreateScheduleCommand"]);
  });

  it("updates the schedule another writer created in the meantime", async () => {
    mocks.schedulerSend
      .mockRejectedValueOnce(awsError("ResourceNotFoundException"))
      .mockRejectedValueOnce(awsError("ConflictException"));

    await scheduleTurnTimeout({ matchId: "match-config", state: startedState(), stateVersion: 1 });

    expect(sentCommands().map((call) => call.name)).toEqual([
      "UpdateScheduleCommand",
      "CreateScheduleCommand",
      "UpdateScheduleCommand"
    ]);
  });

  it("logs a failure with a fixed marker, and lets it reach the caller", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.schedulerSend.mockRejectedValue(awsError("AccessDeniedException"));

    await expect(
      scheduleTurnTimeout({ matchId: "match-config", state: startedState(), stateVersion: 1 })
    ).rejects.toThrow();

    expect(String(logged.mock.calls[0]?.[0])).toContain("TURN_TIMEOUT_SCHEDULE_FAILED");
    logged.mockRestore();
  });

  it("sets nothing for a match that is over", async () => {
    const state = startedState();
    state.winnerId = "P1";

    await scheduleTurnTimeout({ matchId: "match-config", state, stateVersion: 1 });

    expect(mocks.schedulerSend).not.toHaveBeenCalled();
  });

  it("deletes the schedule of a match that is over, and does not mind that there was none", async () => {
    await cancelTurnTimeout("match-config");
    expect(sentCommands()).toEqual([
      { name: "DeleteScheduleCommand", input: { Name: "turn-match-config", GroupName: "default" } }
    ]);

    mocks.schedulerSend.mockRejectedValueOnce(awsError("ResourceNotFoundException"));
    await expect(cancelTurnTimeout("match-config")).resolves.toBeUndefined();
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

  it("names the schedule turn-<matchId>, within 64 characters", () => {
    const longMatchId = "MATCH_1788344944547_c7196c20-e189-47c7-a969-95fbcb0ca8d1";
    const name = sanitizeScheduleName(longMatchId);
    expect(name.startsWith("turn-")).toBe(true);
    expect(name.length).toBeLessThanOrEqual(64);
    expect(/^[0-9a-zA-Z-_.]+$/.test(name)).toBe(true);
    expect(sanitizeScheduleName("room 1/x")).toBe("turn-room-1-x");
  });

  it("never sets a time that is not in the future", () => {
    const now = Date.UTC(2026, 0, 1, 0, 0, 0);
    expect(formatScheduleExpression(now + 30_000, now)).toBe("at(2026-01-01T00:00:30)");
    expect(formatScheduleExpression(now - 5_000, now)).toBe("at(2026-01-01T00:00:01)");
    expect(formatScheduleExpression(now + 29_100, now)).toBe("at(2026-01-01T00:00:30)");
  });
});
