import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";
import { deleteCognitoUserWithAccessToken } from "../auth/cognito-user";
import { deleteUserProfile, findUserByUsername, getUserById, recordAccountDeletionCooldown } from "./user.repository";
import type { User } from "./user.types";

const USERNAME_CHANGE_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";

function formatUsernameChangeDate(timestamp: number): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
    timeZone: "UTC"
  }).format(new Date(timestamp));
}

export async function updateUsername(userId: string, username: string): Promise<User> {
  const newUsername = username.trim();
  const currentUser = await getUserById(userId);
  if (!currentUser) throw new Error("User not found.");
  if (currentUser.username.trim().toLowerCase() === newUsername.toLowerCase()) return currentUser;

  const existing = await findUserByUsername(newUsername);
  if (existing && existing.id !== userId) throw new Error("Operative callsign is already taken.");

  if (currentUser.lastNameChangedAt) {
    const elapsedMs = Date.now() - currentUser.lastNameChangedAt;
    if (elapsedMs < USERNAME_CHANGE_COOLDOWN_MS) {
      const error = new Error(
        `You can only change your operative callsign once every 30 days. ` +
        `Your next change is available on ${formatUsernameChangeDate(currentUser.lastNameChangedAt + USERNAME_CHANGE_COOLDOWN_MS)}.`
      );
      error.name = "UsernameChangeCooldownError";
      throw error;
    }
  }

  await dynamoDb.send(new UpdateCommand({
    TableName: userProfileTable,
    Key: { user_id: userId },
    UpdateExpression: "SET username = :username, lastNameChangedAt = :changedAt",
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeValues: { ":username": newUsername, ":changedAt": Date.now() }
  }));
  return (await getUserById(userId)) || { ...currentUser, username: newUsername, lastNameChangedAt: Date.now() };
}

export async function deleteAccount(userId: string, email: string, accessToken?: string): Promise<void> {
  if (!accessToken?.trim()) {
    const error = new Error("An authenticated access token is required to delete the Cognito account.");
    error.name = "MissingAccessTokenError";
    throw error;
  }
  await recordAccountDeletionCooldown(email);
  await deleteUserProfile(userId);
  await deleteCognitoUserWithAccessToken(accessToken);
}
