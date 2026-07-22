import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import type { SaveDeckPayload, SavedDeck } from "../decks/deck.types";
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
    losses: Number(item.stats?.losses ?? item.losses ?? 0),
    decks: item.decks && typeof item.decks === "object" ? item.decks : undefined
  };
}

function toProfile(user: User, existing: Record<string, any> = {}) {
  return {
    ...existing,
    user_id: user.id,
    email: user.email,
    username: user.username,
    ...(user.avatar ? { avatar_url: user.avatar } : {}),
    ...(user.decks ? { decks: user.decks } : {}),
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
  const users: User[] = [];
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: cursor
    }));
    users.push(...(result.Items || []).map(fromProfile));
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return users;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await dynamoDb.send(new ScanCommand({
    TableName: tableName,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: { ":email": email },
    Limit: 1
  }));
  return result.Items?.[0] ? fromProfile(result.Items[0]) : undefined;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: tableName,
    Key: { user_id: id },
    ConsistentRead: true
  }));
  return result.Item ? fromProfile(result.Item) : undefined;
}

export async function ensureUserProfile(input: {
  id: string;
  email: string;
  username: string;
}): Promise<User> {
  const existing = await getUserById(input.id);
  if (existing) return existing;

  const user: User = {
    id: input.id,
    email: input.email,
    username: input.username,
    elo: 1000,
    wins: 0,
    losses: 0
  };
  try {
    await dynamoDb.send(new PutCommand({
      TableName: tableName,
      Item: toProfile(user),
      ConditionExpression: "attribute_not_exists(user_id)"
    }));
  } catch (error: any) {
    if (error?.name !== "ConditionalCheckFailedException") throw error;
  }
  return (await getUserById(input.id)) || user;
}

export async function saveUsers(users: User[]): Promise<void> {
  await Promise.all(users.map(updateUser));
}

export async function updateUser(user: User): Promise<void> {
  const existingResult = await dynamoDb.send(new GetCommand({
    TableName: tableName,
    Key: { user_id: user.id },
    ConsistentRead: true
  }));
  if (!existingResult.Item) throw new Error("User not found");
  const profile = toProfile(user, existingResult.Item);
  await dynamoDb.send(new UpdateCommand({
    TableName: tableName,
    Key: { user_id: user.id },
    UpdateExpression:
      "SET email = :email, username = :username, #stats = :stats, " +
      "updated_at = :updatedAt" + (user.avatar ? ", avatar_url = :avatar" : ""),
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeNames: { "#stats": "stats" },
    ExpressionAttributeValues: {
      ":email": profile.email,
      ":username": profile.username,
      ":stats": profile.stats,
      ":updatedAt": profile.updated_at,
      ...(user.avatar ? { ":avatar": user.avatar } : {})
    }
  }));
}

export async function saveUserDeck(userId: string, payload: SaveDeckPayload): Promise<SavedDeck> {
  const savedDeck: SavedDeck = {
    ...payload,
    cardIds: [...payload.cardIds],
    updatedAt: Date.now()
  };

  // Initialize the map idempotently, then update one dynamic key. Concurrent
  // saves of different decks cannot overwrite the entire profile or each other.
  await dynamoDb.send(new UpdateCommand({
    TableName: tableName,
    Key: { user_id: userId },
    UpdateExpression: "SET #decks = if_not_exists(#decks, :emptyMap)",
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeNames: { "#decks": "decks" },
    ExpressionAttributeValues: { ":emptyMap": {} }
  }));
  await dynamoDb.send(new UpdateCommand({
    TableName: tableName,
    Key: { user_id: userId },
    UpdateExpression: "SET #decks.#deckId = :deck, updated_at = :updatedAt",
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeNames: { "#decks": "decks", "#deckId": payload.deckId },
    ExpressionAttributeValues: { ":deck": savedDeck, ":updatedAt": savedDeck.updatedAt }
  }));
  return savedDeck;
}

export async function listUserDecks(userId: string): Promise<SavedDeck[]> {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");
  return Object.values(user.decks || {}).sort((left, right) => right.updatedAt - left.updatedAt);
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
