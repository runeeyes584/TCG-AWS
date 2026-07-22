import type { SQSBatchResponse, SQSEvent, SQSRecord } from "aws-lambda";
import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import { calculateElo } from "../matchmaking/elo";
import type { PlayerId } from "../game/types";

const gameStateTable = process.env.GAME_STATE_TABLE || "GameState";
const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";
const matchHistoryTable = process.env.MATCH_HISTORY_TABLE || "MatchHistory";

export interface PostMatchMessage {
  matchId: string;
  winnerId?: PlayerId | "DRAW";
  player1?: { userId?: string };
  player2?: { userId?: string };
  reason?: string;
  endedAt?: number;
}

type Result = "WIN" | "LOSS" | "DRAW";

function ratingOf(profile: Record<string, any>): number {
  const rating = Number(profile.stats?.elo_rating ?? profile.stats?.rank_points ?? 1000);
  return Number.isFinite(rating) ? rating : 1000;
}

function nextStats(
  profile: Record<string, any>,
  rating: number,
  result: Result
): Record<string, any> {
  const previous = profile.stats && typeof profile.stats === "object" ? profile.stats : {};
  const earnedExp = result === "WIN" ? 100 : result === "LOSS" ? 35 : 50;
  const exp = Number(previous.exp ?? 0) + earnedExp;
  return {
    ...previous,
    wins: Number(previous.wins ?? 0) + (result === "WIN" ? 1 : 0),
    losses: Number(previous.losses ?? 0) + (result === "LOSS" ? 1 : 0),
    rank_points: rating,
    elo_rating: rating,
    exp,
    level: Math.floor(exp / 1000) + 1
  };
}

function resultsFor(winnerId: PlayerId | "DRAW"): {
  p1: Result;
  p2: Result;
  eloWinner: "A" | "B" | "DRAW";
} {
  if (winnerId === "P1") return { p1: "WIN", p2: "LOSS", eloWinner: "A" };
  if (winnerId === "P2") return { p1: "LOSS", p2: "WIN", eloWinner: "B" };
  return { p1: "DRAW", p2: "DRAW", eloWinner: "DRAW" };
}

export async function processSingleMatchRecord(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body || "{}") as PostMatchMessage;
  if (!message.matchId) throw new Error(`Invalid post-match message ${record.messageId}.`);

  // GameState is the source of truth. Player IDs and winner supplied in SQS are
  // informational only and cannot be forged to change another user's rating.
  const matchResult = await dynamoDb.send(new GetCommand({
    TableName: gameStateTable,
    Key: { match_id: message.matchId },
    ConsistentRead: true
  }));
  const match = matchResult.Item as Record<string, any> | undefined;
  if (!match) throw new Error(`Match ${message.matchId} was not found.`);
  if (match.post_match_processed_at) return;
  if (match.status !== "FINISHED") {
    throw new Error(`Match ${message.matchId} is not finished.`);
  }

  const player1UserId = match.player_1?.user_id;
  const player2UserId = match.player_2?.user_id;
  const winnerId = match.engine_state?.winnerId ?? match.winner_id ?? message.winnerId;
  if (!player1UserId || !player2UserId || player1UserId === player2UserId) {
    throw new Error(`Match ${message.matchId} does not contain two valid users.`);
  }
  if (winnerId !== "P1" && winnerId !== "P2" && winnerId !== "DRAW") {
    throw new Error(`Match ${message.matchId} has no valid winner.`);
  }

  const [p1Result, p2Result] = await Promise.all([
    dynamoDb.send(new GetCommand({
      TableName: userProfileTable,
      Key: { user_id: player1UserId },
      ConsistentRead: true
    })),
    dynamoDb.send(new GetCommand({
      TableName: userProfileTable,
      Key: { user_id: player2UserId },
      ConsistentRead: true
    }))
  ]);
  const p1Profile = p1Result.Item as Record<string, any> | undefined;
  const p2Profile = p2Result.Item as Record<string, any> | undefined;
  if (!p1Profile || !p2Profile) {
    throw new Error(`A UserProfile is missing for match ${message.matchId}.`);
  }

  const p1Rating = ratingOf(p1Profile);
  const p2Rating = ratingOf(p2Profile);
  const outcomes = resultsFor(winnerId);
  const ratings = calculateElo(p1Rating, p2Rating, outcomes.eloWinner);
  const p1Stats = nextStats(p1Profile, ratings.playerA, outcomes.p1);
  const p2Stats = nextStats(p2Profile, ratings.playerB, outcomes.p2);
  const processedAt = Date.now();
  const playedAt = Number.isFinite(message.endedAt) ? Number(message.endedAt) : processedAt;

  // One transaction updates both players, both histories and the idempotency
  // marker. SQS redelivery can therefore never award a match twice or leave
  // only one player's rating updated.
  await dynamoDb.send(new TransactWriteCommand({
    TransactItems: [
      {
        Update: {
          TableName: gameStateTable,
          Key: { match_id: message.matchId },
          UpdateExpression: "SET post_match_processed_at = :processedAt",
          ConditionExpression: "#status = :finished AND attribute_not_exists(post_match_processed_at)",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":finished": "FINISHED", ":processedAt": processedAt }
        }
      },
      profileUpdate(player1UserId, p1Profile.stats, p1Stats, processedAt),
      profileUpdate(player2UserId, p2Profile.stats, p2Stats, processedAt),
      historyPut(player1UserId, playedAt, message.matchId, player2UserId, outcomes.p1, ratings.playerA - p1Rating),
      historyPut(player2UserId, playedAt, message.matchId, player1UserId, outcomes.p2, ratings.playerB - p2Rating)
    ]
  }));
}

function profileUpdate(
  userId: string,
  oldStats: Record<string, any> | undefined,
  stats: Record<string, any>,
  updatedAt: number
) {
  return {
    Update: {
      TableName: userProfileTable,
      Key: { user_id: userId },
      UpdateExpression: "SET #stats = :stats, updated_at = :updatedAt",
      ConditionExpression: oldStats
        ? "attribute_exists(user_id) AND #stats = :oldStats"
        : "attribute_exists(user_id) AND attribute_not_exists(#stats)",
      ExpressionAttributeNames: { "#stats": "stats" },
      ExpressionAttributeValues: {
        ":stats": stats,
        ":updatedAt": updatedAt,
        ...(oldStats ? { ":oldStats": oldStats } : {})
      }
    }
  };
}

function historyPut(
  userId: string,
  playedAt: number,
  matchId: string,
  opponentId: string,
  result: Result,
  eloChange: number
) {
  return {
    Put: {
      TableName: matchHistoryTable,
      Item: {
        user_id: userId,
        played_at: playedAt,
        match_id: matchId,
        opponent_id: opponentId,
        result,
        rank_point_change: eloChange,
        elo_change: eloChange
      },
      ConditionExpression: "attribute_not_exists(user_id) AND attribute_not_exists(played_at)"
    }
  };
}

export const handler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
  const outcomes = await Promise.all((event.Records ?? []).map(async (record) => {
    try {
      await processSingleMatchRecord(record);
      return undefined;
    } catch (error) {
      console.error(`Failed to process match-result message ${record.messageId}:`, error);
      return { itemIdentifier: record.messageId };
    }
  }));
  return {
    batchItemFailures: outcomes.filter(
      (failure): failure is { itemIdentifier: string } => Boolean(failure)
    )
  };
};
