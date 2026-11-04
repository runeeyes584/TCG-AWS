import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  SchedulerClient,
  UpdateScheduleCommand
} from "@aws-sdk/client-scheduler";
import { ACTION_LATE_TOLERANCE_MS } from "../game/rules/turnClock";
import type { GameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const schedulerClient = new SchedulerClient({ region });

/** Scheduler refuses a time that is not in the future, so a deadline is never set closer than this. */
const MIN_LEAD_MS = 1_000;

export type TurnTimeoutMessage = {
  matchId: string;
  stateVersion: number;
  expectedPlayerId: PlayerId;
  turnStartTime: number;
  turnDuration: number;
  deadline: number;
};

export function getSchedulerRoleArn(): string {
  const roleArn = process.env.TURN_TIMEOUT_SCHEDULER_ROLE_ARN?.trim();
  if (!roleArn) {
    throw new Error("Missing TURN_TIMEOUT_SCHEDULER_ROLE_ARN.");
  }
  if (!roleArn.startsWith("arn:aws:iam::")) {
    throw new Error("Invalid TURN_TIMEOUT_SCHEDULER_ROLE_ARN.");
  }
  return roleArn;
}

export function getHandleTimeoutLambdaArn(): string {
  const lambdaArn = process.env.HANDLE_TIMEOUT_LAMBDA_ARN?.trim();
  if (!lambdaArn) {
    throw new Error("Missing HANDLE_TIMEOUT_LAMBDA_ARN.");
  }
  if (!lambdaArn.startsWith("arn:aws:lambda:")) {
    throw new Error("Invalid HANDLE_TIMEOUT_LAMBDA_ARN.");
  }
  return lambdaArn;
}

export function getSchedulerGroupName(): string {
  return process.env.TURN_TIMEOUT_SCHEDULER_GROUP?.trim() || "default";
}

/** One schedule for a whole match: `turn-<matchId>`, within the 64 characters Scheduler allows. */
export function sanitizeScheduleName(matchId: string): string {
  const prefix = "turn-";
  const room = 64 - prefix.length;
  const cleanMatchId = matchId.replace(/[^a-zA-Z0-9-_.]/g, "-");
  const trimmedMatchId = cleanMatchId.length > room ? cleanMatchId.slice(-room) : cleanMatchId;
  return `${prefix}${trimmedMatchId}`;
}

export function formatScheduleExpression(deadline: number, now = Date.now()): string {
  const target = Math.max(deadline, now + MIN_LEAD_MS);
  const ceilSeconds = Math.ceil(target / 1_000) * 1_000;
  const iso = new Date(ceilSeconds).toISOString().slice(0, 19);
  return `at(${iso})`;
}

export function classifyTurnTimeoutError(error: any): string {
  const msg = typeof error?.message === "string" ? error.message : "";
  const name = typeof error?.name === "string" ? error.name : "";

  if (
    msg.includes("allow AWS EventBridge Scheduler to assume the role") ||
    msg.includes("AssumeRole")
  ) {
    return "ROLE_ASSUME";
  }
  if (
    name === "AccessDeniedException" ||
    msg.includes("iam:PassRole") ||
    msg.includes("AccessDenied")
  ) {
    return "IAM_DENIED";
  }
  if (name === "ResourceNotFoundException") {
    return "NOT_FOUND";
  }
  if (name === "ConflictException") {
    return "CONFLICT";
  }
  if (name === "ValidationException") {
    return "VALIDATION";
  }
  return "UNKNOWN";
}

export function buildTurnTimeoutMessage(input: {
  matchId: string;
  state: GameState;
  stateVersion: number;
  now?: number;
}): { message: TurnTimeoutMessage; delaySeconds: number } | undefined {
  const { matchId, state, stateVersion, now = Date.now() } = input;
  if (!state.started || state.winnerId) return undefined;

  const deadline = state.turnStartTime + state.turnDuration;
  const remainingMilliseconds = Math.max(0, deadline - now);
  const delaySeconds = Math.ceil(remainingMilliseconds / 1_000);

  return {
    message: {
      matchId,
      stateVersion,
      expectedPlayerId: state.priorityPlayerId,
      turnStartTime: state.turnStartTime,
      turnDuration: state.turnDuration,
      deadline
    },
    delaySeconds
  };
}

/**
 * Points the match's one schedule at the deadline of the turn that is running, plus the late allowance during
 * which a player's action still counts, so the safety net never ends a turn that a late click could still play. The schedule is updated, and
 * created only when the match has none yet. It does not delete itself once it has run (`NONE`): the next turn
 * reuses it, and `cancelTurnTimeout` removes it when the match is over. Call it only after the state of the turn
 * has been committed, never before.
 */
export async function scheduleTurnTimeout(input: {
  matchId: string;
  state: GameState;
  stateVersion: number;
  now?: number;
}): Promise<void> {
  const timeout = buildTurnTimeoutMessage(input);
  if (!timeout) return;

  const roleArn = getSchedulerRoleArn();
  const targetArn = getHandleTimeoutLambdaArn();
  const groupName = getSchedulerGroupName();

  const name = sanitizeScheduleName(input.matchId);
  const scheduleExpression = formatScheduleExpression(timeout.message.deadline + ACTION_LATE_TOLERANCE_MS, input.now);

  const schedule = {
    Name: name,
    GroupName: groupName,
    ScheduleExpression: scheduleExpression,
    FlexibleTimeWindow: { Mode: "OFF" as const },
    ActionAfterCompletion: "NONE" as const,
    Target: {
      Arn: targetArn,
      RoleArn: roleArn,
      Input: JSON.stringify(timeout.message),
      RetryPolicy: {
        MaximumEventAgeInSeconds: 300,
        MaximumRetryAttempts: 2
      }
    }
  };

  try {
    await upsertSchedule(schedule);
  } catch (error: any) {
    // The marker is what the CloudWatch alarm on a missing safety net filters for.
    console.error(`TURN_TIMEOUT_SCHEDULE_FAILED [${classifyTurnTimeoutError(error)}]:`, {
      error: error?.message || error,
      name,
      groupName,
      scheduleExpression,
      targetArn,
      roleArn
    });
    throw error;
  }
}

async function upsertSchedule(schedule: ConstructorParameters<typeof CreateScheduleCommand>[0]): Promise<void> {
  try {
    await schedulerClient.send(new UpdateScheduleCommand(schedule));
    return;
  } catch (error: any) {
    if (error?.name !== "ResourceNotFoundException") throw error;
  }

  try {
    await schedulerClient.send(new CreateScheduleCommand(schedule));
  } catch (error: any) {
    // Another writer created it between our update and our create: update theirs.
    if (error?.name !== "ConflictException") throw error;
    await schedulerClient.send(new UpdateScheduleCommand(schedule));
  }
}

// Alias for backwards compatibility
export const enqueueTurnTimeout = scheduleTurnTimeout;

/** Removes the schedule of a match that is over. Nothing to remove is not an error. */
export async function cancelTurnTimeout(matchId: string): Promise<void> {
  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: sanitizeScheduleName(matchId),
        GroupName: getSchedulerGroupName()
      })
    );
  } catch (error: any) {
    if (error?.name !== "ResourceNotFoundException") {
      console.warn("Could not delete turn timeout schedule:", error);
    }
  }
}
