import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { PlayerId } from "../game/types";

const region = process.env.AWS_REGION || process.env.DB_REGION || "ap-southeast-1";
const sqs = new SQSClient({ region });

export interface CompletedMatchRecord {
  match_id: string;
  player_1?: { user_id?: string };
  player_2?: { user_id?: string };
}

export async function enqueueMatchResult(input: {
  match: CompletedMatchRecord;
  winnerId: PlayerId;
  reason: string;
  endedAt?: number;
}): Promise<boolean> {
  const queueUrl = process.env.SQS_MATCH_RESULTS_QUEUE_URL;
  if (!queueUrl) {
    console.error("SQS_MATCH_RESULTS_QUEUE_URL is missing; match result was not queued.");
    return false;
  }

  const player1UserId = input.match.player_1?.user_id;
  const player2UserId = input.match.player_2?.user_id;
  if (!player1UserId || !player2UserId) {
    console.error(`Match ${input.match.match_id} has no authenticated player pair.`);
    return false;
  }

  await sqs.send(new SendMessageCommand({
    QueueUrl: queueUrl,
    MessageBody: JSON.stringify({
      matchId: input.match.match_id,
      winnerId: input.winnerId,
      reason: input.reason,
      endedAt: input.endedAt ?? Date.now(),
      player1: { userId: player1UserId },
      player2: { userId: player2UserId }
    })
  }));
  return true;
}
