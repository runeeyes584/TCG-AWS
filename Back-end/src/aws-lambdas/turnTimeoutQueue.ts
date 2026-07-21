import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { GameState, PlayerId } from "../game/types";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const sqsClient = new SQSClient({ region });

export const MAX_SQS_DELAY_SECONDS = 900;

export type TurnTimeoutMessage = {
  matchId: string;
  stateVersion: number;
  expectedPlayerId: PlayerId;
  turnStartTime: number;
  turnDuration: number;
  deadline: number;
};

function timeoutQueueUrl(): string {
  const queueUrl = process.env.TURN_TIMEOUT_QUEUE_URL;
  if (!queueUrl) throw new Error("Missing TURN_TIMEOUT_QUEUE_URL.");
  return queueUrl;
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
  const delaySeconds = Math.min(
    MAX_SQS_DELAY_SECONDS,
    Math.ceil(remainingMilliseconds / 1_000)
  );

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

export async function enqueueTurnTimeout(input: {
  matchId: string;
  state: GameState;
  stateVersion: number;
  now?: number;
}): Promise<void> {
  const timeout = buildTurnTimeoutMessage(input);
  if (!timeout) return;

  await sqsClient.send(new SendMessageCommand({
    QueueUrl: timeoutQueueUrl(),
    DelaySeconds: timeout.delaySeconds,
    MessageBody: JSON.stringify(timeout.message)
  }));
}
