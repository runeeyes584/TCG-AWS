import { describe, expect, it } from "vitest";
import { listCards } from "../game/entities/cardRegistry";
import { validateSaveDeckPayload } from "./deck.types";

function validPayload() {
  const cardIds = listCards()
    .filter((card) => (card.type === "unit" || card.type === "spell") && card.level !== 2)
    .slice(0, 10)
    .flatMap((card) => [card.id, card.id, card.id]);

  return { deckId: "deck-test-1", deckName: "Test Deck", cardIds };
}

describe("save deck payload", () => {
  it("accepts a legal 30-card deck", () => {
    const result = validateSaveDeckPayload(validPayload());
    expect(result.valid).toBe(true);
  });

  it("rejects decks that do not contain exactly 30 cards", () => {
    const payload = validPayload();
    payload.cardIds.pop();
    const result = validateSaveDeckPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.errors?.map((error) => error.code)).toContain("DECK_SIZE_INVALID");
  });

  it("rejects a fourth copy", () => {
    const payload = validPayload();
    payload.cardIds[payload.cardIds.length - 1] = payload.cardIds[0];
    const result = validateSaveDeckPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.valid ? [] : result.errors?.map((error) => error.code)).toContain("TOO_MANY_COPIES");
  });

  it("rejects unsafe deck IDs", () => {
    const result = validateSaveDeckPayload({ ...validPayload(), deckId: "deck.with.path" });
    expect(result).toEqual({ valid: false, message: "Deck ID is invalid." });
  });
});
