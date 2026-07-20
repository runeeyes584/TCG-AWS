import { SQSEvent, SQSRecord } from "aws-lambda";
import { GetCommand, UpdateCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import { calculateElo } from "../matchmaking/elo";

export interface PostMatchMessage {
  matchId: string;
  winnerId?: "P1" | "P2" | "DRAW" | string;
  player1: { userId: string };
  player2: { userId: string };
  reason?: string;
  endedAt?: number;
}

export const handler = async (event: SQSEvent) => {
  console.log(`Processing ${event.Records?.length || 0} post-match SQS records...`);

  for (const record of event.Records) {
    try {
      await processSingleMatchRecord(record);
    } catch (error) {
      console.error(`Failed to process SQS Record ID ${record.messageId}:`, error);
      // Retrying logic handled by SQS Redrive Policy (DLQ)
      throw error;
    }
  }

  return { statusCode: 200, body: "Post match processing complete." };
};

async function processSingleMatchRecord(record: SQSRecord): Promise<void> {
  const data: PostMatchMessage = JSON.parse(record.body || "{}");
  const { matchId, winnerId, player1, player2, reason } = data;

  if (!matchId || !player1?.userId || !player2?.userId) {
    console.warn("Invalid post-match payload:", data);
    return;
  }

  const p1UserId = player1.userId;
  const p2UserId = player2.userId;
  const endedAt = data.endedAt || Date.now();

  // 1. Tải UserProfile của cả 2 người chơi từ DynamoDB
  const [p1ProfileRes, p2ProfileRes] = await Promise.all([
    dynamoDb.send(new GetCommand({ TableName: "UserProfile", Key: { user_id: p1UserId } })),
    dynamoDb.send(new GetCommand({ TableName: "UserProfile", Key: { user_id: p2UserId } }))
  ]);

  const p1Profile = p1ProfileRes.Item || createDefaultProfile(p1UserId);
  const p2Profile = p2ProfileRes.Item || createDefaultProfile(p2UserId);

  const p1CurrentRank = p1Profile.stats?.rank_points ?? 1000;
  const p2CurrentRank = p2Profile.stats?.rank_points ?? 1000;

  let p1Result: "WIN" | "LOSS" | "DRAW" = "DRAW";
  let p2Result: "WIN" | "LOSS" | "DRAW" = "DRAW";
  let eloWinner: "A" | "B" = "A";

  if (winnerId === "P1") {
    p1Result = "WIN";
    p2Result = "LOSS";
    eloWinner = "A";
  } else if (winnerId === "P2") {
    p1Result = "LOSS";
    p2Result = "WIN";
    eloWinner = "B";
  }

  // 2. Tính toán Rank Points (ELO) mới bằng thuật toán ELO
  const newRatings = calculateElo(p1CurrentRank, p2CurrentRank, eloWinner);
  const p1RankDelta = newRatings.playerA - p1CurrentRank;
  const p2RankDelta = newRatings.playerB - p2CurrentRank;

  // 3. Tính toán EXP thưởng (Thắng +100 EXP, Thua +35 EXP, Hòa +50 EXP)
  const p1ExpEarned = p1Result === "WIN" ? 100 : (p1Result === "LOSS" ? 35 : 50);
  const p2ExpEarned = p2Result === "WIN" ? 100 : (p2Result === "LOSS" ? 35 : 50);

  // 4. Cập nhật UserProfile trong DynamoDB cho cả 2 người chơi bằng cách ghi đè profile hoàn chỉnh
  p1Profile.stats = p1Profile.stats || { wins: 0, losses: 0, rank_points: 1000, elo_rating: 1000, exp: 0, level: 1 };
  p1Profile.stats.rank_points = newRatings.playerA;
  p1Profile.stats.elo_rating = newRatings.playerA;
  p1Profile.stats.exp = (p1Profile.stats.exp ?? 0) + p1ExpEarned;
  p1Profile.stats.level = Math.floor(p1Profile.stats.exp / 1000) + 1;
  if (p1Result === "WIN") p1Profile.stats.wins = (p1Profile.stats.wins ?? 0) + 1;
  if (p1Result === "LOSS") p1Profile.stats.losses = (p1Profile.stats.losses ?? 0) + 1;

  p2Profile.stats = p2Profile.stats || { wins: 0, losses: 0, rank_points: 1000, elo_rating: 1000, exp: 0, level: 1 };
  p2Profile.stats.rank_points = newRatings.playerB;
  p2Profile.stats.elo_rating = newRatings.playerB;
  p2Profile.stats.exp = (p2Profile.stats.exp ?? 0) + p2ExpEarned;
  p2Profile.stats.level = Math.floor(p2Profile.stats.exp / 1000) + 1;
  if (p2Result === "WIN") p2Profile.stats.wins = (p2Profile.stats.wins ?? 0) + 1;
  if (p2Result === "LOSS") p2Profile.stats.losses = (p2Profile.stats.losses ?? 0) + 1;

  await Promise.all([
    savePlayerProfile(p1Profile),
    savePlayerProfile(p2Profile)
  ]);

  // 5. Lưu lịch sử trận đấu vào bảng MatchHistory
  await Promise.all([
    saveMatchHistoryItem(p1UserId, endedAt, matchId, p2UserId, p1Result, p1RankDelta),
    saveMatchHistoryItem(p2UserId, endedAt + 1, matchId, p1UserId, p2Result, p2RankDelta)
  ]);

  console.log(`Match ${matchId} post-processing finished successfully for players ${p1UserId} & ${p2UserId}.`);
}

async function savePlayerProfile(profile: any) {
  await dynamoDb.send(
    new PutCommand({
      TableName: "UserProfile",
      Item: {
        ...profile,
        updated_at: Date.now()
      }
    })
  );
}

async function saveMatchHistoryItem(
  userId: string,
  playedAt: number,
  matchId: string,
  opponentId: string,
  result: "WIN" | "LOSS" | "DRAW",
  rankPointChange: number,
  duration?: number
) {
  await dynamoDb.send(
    new PutCommand({
      TableName: "MatchHistory",
      Item: {
        user_id: userId,
        played_at: playedAt,
        match_id: matchId,
        opponent_id: opponentId,
        result: result,
        rank_point_change: rankPointChange,
        elo_change: rankPointChange,
        duration: duration || 0
      }
    })
  );
}

function createDefaultProfile(userId: string) {
  return {
    user_id: userId,
    username: `User_${userId.slice(0, 5)}`,
    email: `${userId}@example.com`,
    created_at: new Date().toISOString(),
    stats: { wins: 0, losses: 0, rank_points: 1000, elo_rating: 1000, exp: 0, level: 1 }
  };
}
