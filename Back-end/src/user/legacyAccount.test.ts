import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A small in-memory DynamoDB that understands exactly the requests the profile code sends, so a whole move from the
 * old user pool can be checked end to end.
 */
const { send, tables } = vi.hoisted(() => {
  type Item = Record<string, any>;
  const keyFields: Record<string, string[]> = {
    UserProfile: ["user_id"],
    MatchHistory: ["user_id", "played_at"]
  };
  const tables = new Map<string, Map<string, Item>>();
  const table = (name: string) => {
    if (!tables.has(name)) tables.set(name, new Map());
    return tables.get(name)!;
  };
  const keyOf = (name: string, item: Item) => keyFields[name].map((field) => String(item[field])).join("#");
  const conditionHolds = (expression: string | undefined, current: Item | undefined, values: Item = {}) => {
    if (!expression) return true;
    if (expression.startsWith("attribute_not_exists")) return !current;
    if (expression.startsWith("attribute_exists")) return Boolean(current);
    const match = /^(\w+) = (:\w+)$/.exec(expression);
    if (match) return current?.[match[1]] === values[match[2]];
    throw new Error(`Unsupported condition ${expression}`);
  };
  const conditionFailed = () => Object.assign(new Error("condition"), { name: "ConditionalCheckFailedException" });

  const send = vi.fn(async (command: { constructor: { name: string }; input: any }) => {
    const input = command.input;
    switch (command.constructor.name) {
      case "GetCommand": {
        const item = table(input.TableName).get(keyOf(input.TableName, input.Key));
        return { Item: item ? { ...item } : undefined };
      }
      case "PutCommand": {
        const rows = table(input.TableName);
        const key = keyOf(input.TableName, input.Item);
        if (!conditionHolds(input.ConditionExpression, rows.get(key))) throw conditionFailed();
        rows.set(key, { ...input.Item });
        return {};
      }
      case "TransactWriteCommand": {
        for (const operation of input.TransactItems) {
          const write = operation.Put ?? operation.Delete;
          const key = keyOf(write.TableName, operation.Put ? write.Item : write.Key);
          if (!conditionHolds(write.ConditionExpression, table(write.TableName).get(key))) {
            throw Object.assign(new Error("cancelled"), { name: "TransactionCanceledException" });
          }
        }
        for (const operation of input.TransactItems) {
          if (operation.Put) table(operation.Put.TableName).set(keyOf(operation.Put.TableName, operation.Put.Item), { ...operation.Put.Item });
          else table(operation.Delete.TableName).delete(keyOf(operation.Delete.TableName, operation.Delete.Key));
        }
        return {};
      }
      case "UpdateCommand": {
        const rows = table(input.TableName);
        const key = keyOf(input.TableName, input.Key);
        const current = rows.get(key);
        if (!conditionHolds(input.ConditionExpression, current, input.ExpressionAttributeValues)) throw conditionFailed();
        const next = { ...(current ?? input.Key) };
        for (const assignment of input.UpdateExpression.replace(/^SET /, "").split(",")) {
          const [field, value] = assignment.split("=").map((part: string) => part.trim());
          next[field] = input.ExpressionAttributeValues[value];
        }
        rows.set(key, next);
        return {};
      }
      case "QueryCommand": {
        const target = Object.values(input.ExpressionAttributeValues)[0];
        const field = input.IndexName ? input.ExpressionAttributeNames["#key"] : "user_id";
        return { Items: [...table(input.TableName).values()].filter((item) => item[field] === target) };
      }
      case "ScanCommand": {
        const target = input.ExpressionAttributeValues?.[":legacyId"];
        return { Items: [...table(input.TableName).values()].filter((item) => item.opponent_id === target) };
      }
      default:
        throw new Error(`Unsupported command ${command.constructor.name}`);
    }
  });
  return { send, tables };
});

vi.mock("../config/dynamodb", () => ({ dynamoDb: { send } }));

import { ensureUserProfile, ProfileEmailConflictError } from "./user.repository";

const LEGACY = "legacy-sub";
const NEW = "new-sub";
const OTHER = "other-player";

const profiles = () => tables.get("UserProfile")!;
const history = () => tables.get("MatchHistory")!;

function seedLegacyPlayer() {
  profiles().set(LEGACY, {
    user_id: LEGACY,
    email: "ace@example.com",
    username: "Ace",
    stats: { wins: 7, losses: 3, elo_rating: 1234, rank_points: 1234 },
    decks: { main: { deckId: "main", cardIds: ["a"], updatedAt: 1 } },
    leaderboard_scope: "GLOBAL"
  });
  profiles().set(OTHER, { user_id: OTHER, email: "rival@example.com", username: "Rival" });
  history().set(`${LEGACY}#1`, { user_id: LEGACY, played_at: 1, opponent_id: OTHER, result: "WIN" });
  history().set(`${LEGACY}#2`, { user_id: LEGACY, played_at: 2, opponent_id: OTHER, result: "LOSS" });
  history().set(`${OTHER}#1`, { user_id: OTHER, played_at: 1, opponent_id: LEGACY, result: "LOSS" });
}

const identity = { id: NEW, email: "ace@example.com", username: "Ace", legacyId: LEGACY };

describe("ensureUserProfile with a player moved from the old user pool", () => {
  beforeEach(() => {
    tables.clear();
    tables.set("UserProfile", new Map());
    tables.set("MatchHistory", new Map());
    send.mockClear();
  });

  it("moves the profile to the new id, keeping stats and decks, and removes it from the old id", async () => {
    seedLegacyPlayer();

    const user = await ensureUserProfile(identity);

    expect(user).toMatchObject({ id: NEW, elo: 1234, wins: 7, losses: 3 });
    expect(user.decks?.main.deckId).toBe("main");
    expect(profiles().has(LEGACY)).toBe(false);
    expect(profiles().get(NEW)).toMatchObject({ legacy_user_id: LEGACY, email_lower: "ace@example.com" });
    expect(profiles().get(NEW)?.legacy_history_moved_at).toEqual(expect.any(Number));
  });

  it("moves the player's own history and the other players' references to them", async () => {
    seedLegacyPlayer();

    await ensureUserProfile(identity);

    expect([...history().values()].filter((item) => item.user_id === LEGACY)).toHaveLength(0);
    expect([...history().values()].filter((item) => item.user_id === NEW).map((item) => item.result).sort())
      .toEqual(["LOSS", "WIN"]);
    expect(history().get(`${OTHER}#1`)?.opponent_id).toBe(NEW);
  });

  it("finishes a move that was cut short before the history was moved", async () => {
    seedLegacyPlayer();
    const { legacy_user_id: _ignored, ...legacy } = profiles().get(LEGACY)!;
    profiles().delete(LEGACY);
    profiles().set(NEW, { ...legacy, user_id: NEW, legacy_user_id: LEGACY });

    await ensureUserProfile(identity);

    expect([...history().values()].filter((item) => item.user_id === LEGACY)).toHaveLength(0);
    expect(profiles().get(NEW)?.legacy_history_moved_at).toEqual(expect.any(Number));
  });

  it("does nothing more on later sign-ins", async () => {
    seedLegacyPlayer();
    await ensureUserProfile(identity);
    send.mockClear();

    await ensureUserProfile(identity);

    const names = send.mock.calls.map(([command]) => command.constructor.name);
    expect(names).not.toContain("TransactWriteCommand");
    expect(names).not.toContain("ScanCommand");
  });

  it("never deletes a profile that shares the email without a link to it", async () => {
    profiles().set("someone-else", { user_id: "someone-else", email: "ace@example.com", email_lower: "ace@example.com", username: "Ace" });

    await expect(ensureUserProfile({ id: NEW, email: "ace@example.com", username: "Ace" }))
      .rejects.toBeInstanceOf(ProfileEmailConflictError);
    expect(profiles().has("someone-else")).toBe(true);
    expect(profiles().has(NEW)).toBe(false);
  });

  it("creates a fresh profile for a new player", async () => {
    const user = await ensureUserProfile({ id: NEW, email: "new@example.com", username: "Newbie" });

    expect(user).toMatchObject({ id: NEW, elo: 1000, wins: 0, losses: 0 });
    expect(profiles().get(NEW)?.legacy_user_id).toBeUndefined();
  });

  it("creates a fresh profile when the old id has no profile to move", async () => {
    const user = await ensureUserProfile(identity);

    expect(user).toMatchObject({ id: NEW, elo: 1000 });
  });
});
