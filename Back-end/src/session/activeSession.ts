import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { dynamoDb } from "../config/dynamodb";

/**
 * One account plays from one place at a time: the latest sign-in wins. The session is the `origin_jti` claim of the
 * Cognito access token, which stays the same across refreshes of one sign-in and is new at every sign-in. The
 * session that may act is recorded on the player's profile (`active_session`).
 */

const profileTable = process.env.USER_PROFILE_TABLE || process.env.USER_TABLE || "UserProfile";

export const SESSION_REPLACED = "SESSION_REPLACED";

/** The request comes from a session that a later sign-in has replaced. */
export class SessionReplacedError extends Error {
  constructor() {
    super("Your account has signed in on another device or browser. Please sign in again.");
    this.name = "SessionReplacedError";
  }
}

export interface SessionClaims {
  readonly sub?: unknown;
  readonly origin_jti?: unknown;
}

/** The session a token belongs to, or undefined when the token does not say (then it cannot be checked). */
export function sessionIdOf(claims: SessionClaims): string | undefined {
  return typeof claims.origin_jti === "string" && claims.origin_jti ? claims.origin_jti : undefined;
}

/**
 * Whether a session may act. A profile with no session recorded yet (signed in before sessions were tracked) and a
 * token without a session id are let through: they cannot be compared, and refusing them would sign players out.
 */
export function isCurrentSession(activeSession: string | undefined, sessionId: string | undefined): boolean {
  return !activeSession || !sessionId || activeSession === sessionId;
}

export async function readActiveSession(userId: string): Promise<string | undefined> {
  const result = await dynamoDb.send(new GetCommand({
    TableName: profileTable,
    Key: { user_id: userId },
    ProjectionExpression: "active_session",
    ConsistentRead: true
  }));
  const value = result.Item?.active_session;
  return typeof value === "string" && value ? value : undefined;
}

/** Makes this session the one that may act; any earlier session of the player stops working. */
export async function activateSession(userId: string, sessionId: string): Promise<void> {
  await dynamoDb.send(new UpdateCommand({
    TableName: profileTable,
    Key: { user_id: userId },
    UpdateExpression: "SET active_session = :session, active_session_at = :now",
    ConditionExpression: "attribute_exists(user_id)",
    ExpressionAttributeValues: { ":session": sessionId, ":now": Date.now() }
  }));
}

/** Ends this session on sign-out, but never a later one that has already taken its place. */
export async function endSession(userId: string, sessionId: string): Promise<void> {
  try {
    await dynamoDb.send(new UpdateCommand({
      TableName: profileTable,
      Key: { user_id: userId },
      UpdateExpression: "REMOVE active_session, active_session_at",
      ConditionExpression: "active_session = :session",
      ExpressionAttributeValues: { ":session": sessionId }
    }));
  } catch (error) {
    if ((error as { name?: string } | undefined)?.name !== "ConditionalCheckFailedException") throw error;
  }
}

/** Throws `SessionReplacedError` when the token's session is no longer the player's active one. */
export async function assertActiveSession(claims: SessionClaims): Promise<void> {
  const userId = typeof claims.sub === "string" ? claims.sub : undefined;
  const sessionId = sessionIdOf(claims);
  if (!userId || !sessionId) return;
  if (!isCurrentSession(await readActiveSession(userId), sessionId)) throw new SessionReplacedError();
}
