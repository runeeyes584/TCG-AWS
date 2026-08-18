import { DeleteCommand, GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import type { SaveDeckPayload, SavedDeck } from "../decks/deck.types";
import { calculateElo } from "../matchmaking/elo";
import type { User } from "./user.types";
import { buildLeaderboardProjection } from "../leaderboard/leaderboard";

const tableName = process.env.USER_PROFILE_TABLE || "UserProfile";
const deletionCooldownTable = process.env.ACCOUNT_DELETION_COOLDOWN_TABLE || "AccountDeletionCooldown";
const DELETION_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const normalizeUsername = (username: string) => username.trim().toLowerCase();

function isLegacyUsername(username: string, userId: string): boolean {
  const value = username.trim();
  return !value ||
    value.toLowerCase() === userId.trim().toLowerCase() ||
    /^user_[0-9a-f-]{5,}$/i.test(value) ||
    /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);
}
function fromProfile(item: Record<string, any>): User {
  return {
    id: String(item.user_id),
    email: String(item.email || ""),
    username: String(item.username || "Unregistered operative"),
    avatar: item.avatar_url || item.avatar,
    elo: Number(item.stats?.elo_rating ?? item.stats?.rank_points ?? item.elo ?? 1000),
    wins: Number(item.stats?.wins ?? item.wins ?? 0),
    losses: Number(item.stats?.losses ?? item.losses ?? 0),
    decks: item.decks && typeof item.decks === "object" ? item.decks : undefined,
    lastNameChangedAt: typeof item.lastNameChangedAt === "number" ? item.lastNameChangedAt : undefined
  };
}

function toProfile(user: User, existing: Record<string, any> = {}) {
  const updatedAt = Date.now();
  const profile = {
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
    updated_at: updatedAt
  };
  return {
    ...profile,
    ...buildLeaderboardProjection(profile, updatedAt)
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
  const target = normalizeEmail(email);
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: cursor }));
    const match = (result.Items || []).find((item) => normalizeEmail(String(item.email || "")) === target);
    if (match) return fromProfile(match);
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return undefined;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const target = normalizeUsername(username);
  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: cursor }));
    const match = (result.Items || []).find((item) => normalizeUsername(String(item.username || "")) === target);
    if (match) return fromProfile(match);
    cursor = result.LastEvaluatedKey;
  } while (cursor);
  return null;
}

export async function isEmailInDeletionCooldown(email: string): Promise<{ inCooldown: boolean; availableAt?: number }> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: deletionCooldownTable,
    Key: { email: normalizeEmail(email) },
    ConsistentRead: true
  }));
  const availableAtSeconds = Number(result.Item?.available_at || 0);
  const availableAt = availableAtSeconds * 1000;
  return availableAt > Date.now() ? { inCooldown: true, availableAt } : { inCooldown: false };
}

export async function recordAccountDeletionCooldown(email: string): Promise<void> {
  const deletedAt = Math.floor(Date.now() / 1000);
  await dynamoDb.send(new PutCommand({
    TableName: deletionCooldownTable,
    Item: {
      email: normalizeEmail(email),
      deleted_at: deletedAt,
      available_at: deletedAt + Math.floor(DELETION_COOLDOWN_MS / 1000)
    }
  }));
}

export async function getUserById(id: string): Promise<User | undefined> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: tableName,
    Key: { user_id: id },
    ConsistentRead: true
  }));
  return result.Item ? fromProfile(result.Item) : undefined;
}

export async function deleteUserProfile(id: string): Promise<void> {
  await dynamoDb.send(new DeleteCommand({
    TableName: tableName,
    Key: { user_id: id }
  }));
}

export async function ensureUserProfile(input: {
  id: string;
  email: string;
  username: string;
}): Promise<User> {
  const existing = await getUserById(input.id);
  if (existing) {
    return (await repairUserProfileIdentity(input)) || existing;
  }

  let cursor: Record<string, unknown> | undefined;
  do {
    const result = await dynamoDb.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: cursor }));
    for (const item of result.Items || []) {
      if (String(item.user_id) !== input.id && normalizeEmail(String(item.email || "")) === normalizeEmail(input.email)) {
        await deleteUserProfile(String(item.user_id));
      }
    }
    cursor = result.LastEvaluatedKey;
  } while (cursor);

  const user: User = {
    id: input.id,
    email: normalizeEmail(input.email),
    username: input.username.trim(),
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

/**
 * Repairs identity fields without replacing gameplay data. This is important
 * for profiles created by an older auth flow that accidentally persisted the
 * Cognito internal Username/sub as email or callsign.
 */
export async function repairUserProfileIdentity(input: {
  id: string;
  email: string;
  username: string;
}): Promise<User | undefined> {
  const existingResult = await dynamoDb.send(new GetCommand({
    TableName: tableName,
    Key: { user_id: input.id },
    ConsistentRead: true
  }));
  if (!existingResult.Item) return undefined;

  const normalizedEmail = normalizeEmail(input.email);
  const normalizedUsername = input.username.trim();
  const currentEmail = String(existingResult.Item.email || "");
  const currentUsername = String(existingResult.Item.username || "");
  // Cognito's preferred_username is the initial callsign only. After a
  // successful rename, the DynamoDB value is authoritative and must not be
  // overwritten on every profile load. Replace the username only when the
  // stored value is a known legacy identity placeholder.
  const shouldRepairUsername = isLegacyUsername(currentUsername, input.id);
  const nextUsername = shouldRepairUsername ? normalizedUsername : currentUsername;
  if (currentEmail === normalizedEmail && currentUsername === nextUsername) {
    return fromProfile(existingResult.Item);
  }

  await dynamoDb.send(new UpdateCommand({
    TableName: tableName,
    Key: { user_id: input.id },
    UpdateExpression: "SET email = :email, username = :username, updated_at = :updatedAt",
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeValues: {
      ":email": normalizedEmail,
      ":username": nextUsername,
      ":updatedAt": Date.now()
    }
  }));

  return getUserById(input.id);
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
      "updated_at = :updatedAt, leaderboard_scope = :scope, " +
      "leaderboard_sort = :sort, leaderboard_elo = :elo, " +
      "leaderboard_win_rate = :winRate, leaderboard_wins = :wins, " +
      "leaderboard_losses = :losses, leaderboard_projected_at = :projectedAt" +
      (user.avatar ? ", avatar_url = :avatar" : ""),
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeNames: { "#stats": "stats" },
    ExpressionAttributeValues: {
      ":email": profile.email,
      ":username": profile.username,
      ":stats": profile.stats,
      ":updatedAt": profile.updated_at,
      ":scope": profile.leaderboard_scope,
      ":sort": profile.leaderboard_sort,
      ":elo": profile.leaderboard_elo,
      ":winRate": profile.leaderboard_win_rate,
      ":wins": profile.leaderboard_wins,
      ":losses": profile.leaderboard_losses,
      ":projectedAt": profile.leaderboard_projected_at,
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
