import { beforeEach, describe, expect, it, vi } from "vitest";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send } }));

import { listUserDecks, saveUserDeck } from "./user.repository";

const payload = {
  deckId: "deck-alpha",
  deckName: "Alpha",
  cardIds: Array.from({ length: 30 }, (_, index) => `card-${index}`)
};

describe("DynamoDB user deck persistence", () => {
  beforeEach(() => send.mockReset());

  it("updates only the authenticated user's requested deck key", async () => {
    send.mockResolvedValue({});
    const saved = await saveUserDeck("user-1", payload);

    expect(saved.deckId).toBe("deck-alpha");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0].input).toMatchObject({
      TableName: "UserProfile",
      Key: { user_id: "user-1" },
      ConditionExpression: "attribute_exists(user_id)"
    });
    expect(send.mock.calls[1][0].input).toMatchObject({
      Key: { user_id: "user-1" },
      ExpressionAttributeNames: { "#decks": "decks", "#deckId": "deck-alpha" }
    });
    expect(send.mock.calls[1][0].input.UpdateExpression).toContain("#decks.#deckId");
  });

  it("loads and sorts the real profile deck map", async () => {
    send.mockResolvedValue({
      Item: {
        user_id: "user-1",
        decks: {
          old: { ...payload, deckId: "old", updatedAt: 10 },
          newest: { ...payload, deckId: "newest", updatedAt: 20 }
        }
      }
    });

    const decks = await listUserDecks("user-1");
    expect(decks.map((deck) => deck.deckId)).toEqual(["newest", "old"]);
    expect(send.mock.calls[0][0].input).toMatchObject({
      Key: { user_id: "user-1" },
      ConsistentRead: true
    });
  });
});
