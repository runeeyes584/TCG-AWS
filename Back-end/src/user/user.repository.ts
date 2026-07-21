import { GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

import { dynamoDb } from "../config/dynamodb";
import { calculateElo } from "../matchmaking/elo";
import type { User } from "./user.types";

const tableName = process.env.USER_PROFILE_TABLE || "UserProfile";

function fromProfile(item: Record<string, any>): User {
  return {
    id: String(item.user_id),
    email: String(item.email || ""),
    username: String(item.username || `User_${String(item.user_id).slice(0, 5)}`),
    avatar: item.avatar_url || item.avatar,
    elo: Number(item.stats?.elo_rating ?? item.stats?.rank_points ?? item.elo ?? 1000),
    wins: Number(item.stats?.wins ?? item.wins ?? 0),
    losses: Number(item.stats?.losses ?? item.losses ?? 0)
  };
}

function toProfile(user: User, existing: Record<string, any> = {}) {
  return {
    ...existing,
    user_id: user.id,
    email: user.email,
    username: user.username,
    ...(user.avatar ? { avatar_url: user.avatar } : {}),
    stats: {
      ...(existing.stats || {}),
      wins: user.wins,
      losses: user.losses,
      rank_points: user.elo,
      elo_rating: user.elo,
      exp: Number(existing.stats?.exp ?? 0),
      level: Number(existing.stats?.level ?? 1)
    },
    created_at: existing.created_at || new Date().toISOString(),
    updated_at: Date.now()
  };
}

export async function getUsers(): Promise<User[]> {
  const result = await dynamoDb.send(new ScanCommand({ TableName: tableName }));
  return (result.Items || []).map(fromProfile);
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await dynamoDb.send(
    new ScanCommand({
      TableName: tableName,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email },
      Limit: 1
    })
  );
  return result.Items?.[0] ? fromProfile(result.Items[0]) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await dynamoDb.send(
    new GetCommand({ TableName: tableName, Key: { user_id: id } })
  );
  return result.Item ? fromProfile(result.Item) : undefined;
}

export async function ensureUserProfile(input: {
  id: string;
  email: string;
  username: string;
}): Promise<User> {
  const existingResult = await dynamoDb.send(
    new GetCommand({ TableName: tableName, Key: { user_id: input.id } })
  );
  if (existingResult.Item) return fromProfile(existingResult.Item);

  const user: User = {
    id: input.id,
    email: input.email,
    username: input.username,
    elo: 1000,
    wins: 0,
    losses: 0
  };

  await dynamoDb.send(
    new PutCommand({
      TableName: tableName,
      Item: toProfile(user),
      ConditionExpression: "attribute_not_exists(user_id)"
    })
  ).catch(async (error: any) => {
    if (error?.name !== "ConditionalCheckFailedException") throw error;
  });

  return (await getUserById(input.id)) || user;
}

export async function saveUsers(users: User[]): Promise<void> {
  await Promise.all(users.map(updateUser));
}

export async function updateUser(user: User): Promise<void> {
  const existingResult = await dynamoDb.send(
    new GetCommand({ TableName: tableName, Key: { user_id: user.id } })
  );
  await dynamoDb.send(
    new PutCommand({ TableName: tableName, Item: toProfile(user, existingResult.Item) })
  );
}

export async function recordMatchResult(
  winnerId: string,
  loserId: string
): Promise<{ winner: User; loser: User }> {
  const [winner, loser] = await Promise.all([getUserById(winnerId), getUserById(loserId)]);
  if (!winner || !loser) {
    throw new Error("Cannot record a match result for an unknown user.");
  }

  const ratings = calculateElo(winner.elo, loser.elo, "A");
  winner.elo = ratings.playerA;
  winner.wins += 1;
  loser.elo = ratings.playerB;
  loser.losses += 1;
  await Promise.all([updateUser(winner), updateUser(loser)]);
  return { winner, loser };
}
