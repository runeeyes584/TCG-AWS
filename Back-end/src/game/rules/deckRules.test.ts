import { describe, expect, it } from "vitest";
import { getCardDefinition, listCards, registerCardDefinition } from "../cardRegistry";
import { validateDeck } from "./deckRules";

function validThirtyCardDeck(): string[] {
  const legalCards = listCards()
    .filter((card) => card.type !== "champion")
    .slice(0, 10)
    .map((card) => card.id);

  return legalCards.flatMap((cardId) => [cardId, cardId, cardId]);
}

describe("deck validation rules", () => {
  it("valid 30-card deck passes", () => {
    const result = validateDeck(validThirtyCardDeck());

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("deck with 29 or 31 cards fails DECK_SIZE_INVALID", () => {
    const twentyNine = validateDeck(validThirtyCardDeck().slice(0, 29));
    const thirtyOne = validateDeck([...validThirtyCardDeck(), "sparksmith"]);

    expect(twentyNine.errors.map((error) => error.code)).toContain("DECK_SIZE_INVALID");
    expect(thirtyOne.errors.map((error) => error.code)).toContain("DECK_SIZE_INVALID");
  });

  it("unknown cardId fails CARD_NOT_FOUND", () => {
    const result = validateDeck(["missing-card"], { deckSize: 1 });

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "CARD_NOT_FOUND", cardId: "missing-card" })
    );
  });

  it("more than max copies fails TOO_MANY_COPIES", () => {
    const result = validateDeck(["sparksmith", "sparksmith", "sparksmith", "sparksmith"], {
      deckSize: 4
    });

    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: "TOO_MANY_COPIES", cardId: "sparksmith" })
    );
  });

  it("more than max champion cards fails TOO_MANY_CHAMPIONS", () => {
    const champion = getCardDefinition("kalista-1");
    const result = validateDeck(Array.from({ length: 7 }, () => champion.id), {
      deckSize: 7,
      maxCopiesPerCard: 10
    });

    expect(result.errors.map((error) => error.code)).toContain("TOO_MANY_CHAMPIONS");
  });

  it("level 2 champion in deck fails LEVEL_2_CHAMPION_NOT_ALLOWED", () => {
    const result = validateDeck(["kalista-2"], { deckSize: 1 });

    expect(result.errors).toContainEqual(
      expect.objectContaining({
        code: "LEVEL_2_CHAMPION_NOT_ALLOWED",
        cardId: "kalista-2"
      })
    );
  });

  it("validateDeck returns multiple errors at once", () => {
    registerCardDefinition({
      id: "deck-test-level-2",
      name: "Deck Test Level 2",
      type: "champion",
      cost: 1,
      attack: 1,
      health: 1,
      level: 2
    });

    const result = validateDeck(
      [
        "missing-card",
        "deck-test-level-2",
        "deck-test-level-2",
        "deck-test-level-2",
        "deck-test-level-2"
      ],
      { deckSize: 30 }
    );

    expect(result.errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "DECK_SIZE_INVALID",
        "CARD_NOT_FOUND",
        "TOO_MANY_COPIES",
        "LEVEL_2_CHAMPION_NOT_ALLOWED"
      ])
    );
  });
});
