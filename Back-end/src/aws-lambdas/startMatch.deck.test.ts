import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultDeckCardIds } from "../game/entities/defaultDeck";

const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send } }));

import { resolveDeckSelection } from "./startMatch";

describe("server-authoritative matchmaking deck selection", () => {
  beforeEach(() => send.mockReset());

  it("uses the saved DynamoDB cards instead of client-supplied cards", async () => {
    const savedCardIds = getDefaultDeckCardIds();
    send.mockResolvedValue({
      Item: { decks: { "deck-owned": { deckId: "deck-owned", cardIds: savedCardIds } } }
    });

    const selection = await resolveDeckSelection("user-1", {
      deckId: "deck-owned",
      cardIds: ["client-tampered-card"]
    });

    expect(selection).toEqual({ deckId: "deck-owned", cardIds: savedCardIds });
    expect(send.mock.calls[0][0].input).toMatchObject({
      Key: { user_id: "user-1" },
      ConsistentRead: true
    });
  });

  it("rejects a deck that is not owned by the authenticated user", async () => {
    send.mockResolvedValue({ Item: { decks: {} } });
    await expect(resolveDeckSelection("user-1", { deckId: "deck-other" }))
      .rejects.toThrow("not saved to this account");
  });
});
