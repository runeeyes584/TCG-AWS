import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send } }));

import {
  activateSession,
  assertActiveSession,
  endSession,
  isCurrentSession,
  SessionReplacedError,
  sessionIdOf
} from "./activeSession";

const failedCondition = () => Object.assign(new Error("condition"), { name: "ConditionalCheckFailedException" });

describe("the session of a token", () => {
  it("is its origin_jti", () => {
    expect(sessionIdOf({ origin_jti: "abc" })).toBe("abc");
    expect(sessionIdOf({})).toBeUndefined();
    expect(sessionIdOf({ origin_jti: 42 })).toBeUndefined();
  });
});

describe("isCurrentSession", () => {
  it("accepts the active session and refuses another one", () => {
    expect(isCurrentSession("new", "new")).toBe(true);
    expect(isCurrentSession("new", "old")).toBe(false);
  });

  it("lets through what cannot be compared, so nobody is signed out by mistake", () => {
    expect(isCurrentSession(undefined, "any")).toBe(true);
    expect(isCurrentSession("new", undefined)).toBe(true);
  });
});

describe("session records on the profile", () => {
  beforeEach(() => send.mockReset());

  it("records the new sign-in as the active one, on an existing profile only", async () => {
    send.mockResolvedValue({});

    await activateSession("user-1", "session-1");

    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: "UserProfile",
      Key: { user_id: "user-1" },
      UpdateExpression: "SET active_session = :session, active_session_at = :now",
      ConditionExpression: "attribute_exists(user_id)",
      ExpressionAttributeValues: { ":session": "session-1" }
    });
  });

  it("ends only its own session on sign-out", async () => {
    send.mockResolvedValue({});

    await endSession("user-1", "session-1");

    expect(send.mock.calls[0][0].input).toMatchObject({
      UpdateExpression: "REMOVE active_session, active_session_at",
      ConditionExpression: "active_session = :session",
      ExpressionAttributeValues: { ":session": "session-1" }
    });
  });

  it("leaves a later session in place when an earlier one signs out", async () => {
    send.mockRejectedValueOnce(failedCondition());

    await expect(endSession("user-1", "old")).resolves.toBeUndefined();
  });

  it("refuses a token whose session a later sign-in replaced", async () => {
    send.mockResolvedValue({ Item: { active_session: "new" } });

    await expect(assertActiveSession({ sub: "user-1", origin_jti: "old" })).rejects.toBeInstanceOf(SessionReplacedError);
  });

  it("accepts the active session's token", async () => {
    send.mockResolvedValue({ Item: { active_session: "new" } });

    await expect(assertActiveSession({ sub: "user-1", origin_jti: "new" })).resolves.toBeUndefined();
    expect(send.mock.calls[0][0].input).toMatchObject({ Key: { user_id: "user-1" }, ConsistentRead: true });
  });

  it("does not read the profile for a token that cannot be checked", async () => {
    await assertActiveSession({ sub: "user-1" });

    expect(send).not.toHaveBeenCalled();
  });
});
