import {
  CreateScheduleCommand,
  DeleteScheduleCommand,
  SchedulerClient
} from "@aws-sdk/client-scheduler";
import type { GameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const schedulerClient = new SchedulerClient({ region });

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

export function sanitizeScheduleName(matchId: string, stateVersion: number): string {
  const prefix = "turn-";
  const suffix = `-v${stateVersion}`;
  const maxMatchIdLength = Math.max(10, 64 - prefix.length - suffix.length);
  const cleanMatchId = matchId.replace(/[^a-zA-Z0-9-_.]/g, "-");
  const trimmedMatchId =
    cleanMatchId.length > maxMatchIdLength
      ? cleanMatchId.slice(-maxMatchIdLength)
      : cleanMatchId;
  const name = `${prefix}${trimmedMatchId}${suffix}`;
  return name.length > 64 ? name.slice(0, 64) : name;
}

export function formatScheduleExpression(deadline: number): string {
  const ceilSeconds = Math.ceil(deadline / 1_000) * 1_000;
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

  const name = sanitizeScheduleName(input.matchId, input.stateVersion);
  const scheduleExpression = formatScheduleExpression(timeout.message.deadline);

  const command = new CreateScheduleCommand({
    Name: name,
    GroupName: groupName,
    ScheduleExpression: scheduleExpression,
    FlexibleTimeWindow: { Mode: "OFF" },
    ActionAfterCompletion: "DELETE",
    Target: {
      Arn: targetArn,
      RoleArn: roleArn,
      Input: JSON.stringify(timeout.message),
      RetryPolicy: {
        MaximumEventAgeInSeconds: 300,
        MaximumRetryAttempts: 2
      }
    }
  });

  try {
    await schedulerClient.send(command);
  } catch (error: any) {
    const code = classifyTurnTimeoutError(error);
    console.error(`Could not schedule turn timeout [${code}]:`, {
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

// Alias for backwards compatibility
export const enqueueTurnTimeout = scheduleTurnTimeout;

export async function cancelTurnTimeout(matchId: string, stateVersion: number): Promise<void> {
  const groupName = getSchedulerGroupName();
  const name = sanitizeScheduleName(matchId, stateVersion);

  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: name,
        GroupName: groupName
      })
    );
  } catch (error: any) {
    if (error?.name !== "ResourceNotFoundException") {
      console.warn("Could not delete turn timeout schedule:", error);
    }
  }
}
