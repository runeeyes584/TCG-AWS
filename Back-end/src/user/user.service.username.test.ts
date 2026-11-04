import { beforeEach, describe, expect, it, vi } from "vitest";

const { send, getUserById, findUserByUsername } = vi.hoisted(() => ({
  send: vi.fn(),
  getUserById: vi.fn(),
  findUserByUsername: vi.fn()
}));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send } }));
vi.mock("../auth/cognito-user", () => ({ deleteCognitoUserWithAccessToken: vi.fn() }));
vi.mock("./user.repository", () => ({
  getUserById,
  findUserByUsername,
  deleteUserProfile: vi.fn(),
  recordAccountDeletionCooldown: vi.fn()
}));

import { updateUsername } from "./user.service";

const DAY = 24 * 60 * 60 * 1000;
const user = (over: Record<string, unknown> = {}) => ({ id: "u1", username: "khangcachua", ...over });

describe("updateUsername", () => {
  beforeEach(() => {
    send.mockReset().mockResolvedValue({});
    getUserById.mockReset().mockResolvedValue(user());
    findUserByUsername.mockReset().mockResolvedValue(null);
  });

  it("keeps the capitals the player wrote, and moves the lookup key with the name", async () => {
    await updateUsername("u1", "  KhangCachua2 ");

    const input = send.mock.calls[0][0].input;
    expect(input.ExpressionAttributeValues).toMatchObject({
      ":username": "KhangCachua2",
      ":usernameLower": "khangcachua2"
    });
    expect(input.UpdateExpression).toContain("username_lower = :usernameLower");
  });

  it("changes a name whose letters differ only in case", async () => {
    // The lookup finds the player's own record: it is not a clash.
    findUserByUsername.mockResolvedValue(user());
    await updateUsername("u1", "KhangCachua");

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input.ExpressionAttributeValues[":username"]).toBe("KhangCachua");
  });

  it("does nothing when the name is exactly the same", async () => {
    await updateUsername("u1", "khangcachua");
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a name another player has, whatever its capitals", async () => {
    findUserByUsername.mockResolvedValue(user({ id: "u2", username: "Taken" }));
    await expect(updateUsername("u1", "TAKEN")).rejects.toThrow(/already taken/i);
    expect(send).not.toHaveBeenCalled();
  });

  it("refuses a second change inside the 30 days", async () => {
    getUserById.mockResolvedValue(user({ lastNameChangedAt: Date.now() - 2 * DAY }));
    await expect(updateUsername("u1", "Another")).rejects.toMatchObject({ name: "UsernameChangeCooldownError" });
    expect(send).not.toHaveBeenCalled();
  });

  it("allows a change after the 30 days", async () => {
    getUserById.mockResolvedValue(user({ lastNameChangedAt: Date.now() - 31 * DAY }));
    await updateUsername("u1", "Another");
    expect(send).toHaveBeenCalledTimes(1);
  });
});
