import { getCardDefinition, hasCard } from "../cardRegistry";
import { isChampionCard } from "../cards";
import { GameValidationError } from "../types";

export interface DeckValidationRules {
  deckSize: number;
  maxCopiesPerCard: number;
  maxChampionCards: number;
  allowLevel2ChampionsInDeck: boolean;
}

export interface DeckValidationError {
  code: string;
  message: string;
  cardId?: string;
}

export interface DeckValidationResult {
  valid: boolean;
  errors: DeckValidationError[];
}

export const DEFAULT_DECK_RULES: DeckValidationRules = {
  deckSize: 30,
  maxCopiesPerCard: 3,
  maxChampionCards: 6,
  allowLevel2ChampionsInDeck: false
};

export function validateDeck(
  cardIds: string[],
  rules: Partial<DeckValidationRules> = {}
): DeckValidationResult {
  const resolvedRules = { ...DEFAULT_DECK_RULES, ...rules };
  const errors: DeckValidationError[] = [];

  if (cardIds.length !== resolvedRules.deckSize) {
    errors.push({
      code: "DECK_SIZE_INVALID",
      message: `Deck must contain exactly ${resolvedRules.deckSize} cards.`
    });
  }

  const counts = new Map<string, number>();
  for (const cardId of cardIds) {
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
  }

  for (const [cardId, count] of counts) {
    if (!hasCard(cardId)) {
      errors.push({
        code: "CARD_NOT_FOUND",
        message: `Card not found: ${cardId}`,
        cardId
      });
      continue;
    }

    if (count > resolvedRules.maxCopiesPerCard) {
      errors.push({
        code: "TOO_MANY_COPIES",
        message: `Too many copies of ${cardId}: ${count}/${resolvedRules.maxCopiesPerCard}.`,
        cardId
      });
    }

    const definition = getCardDefinition(cardId);
    if (
      definition.type !== "unit" &&
      definition.type !== "spell" &&
      definition.type !== "champion"
    ) {
      errors.push({
        code: "INVALID_CARD_TYPE",
        message: `Invalid card type for ${cardId}: ${definition.type}`,
        cardId
      });
    }

    if (
      isChampionCard(definition) &&
      definition.level === 2 &&
      !resolvedRules.allowLevel2ChampionsInDeck
    ) {
      errors.push({
        code: "LEVEL_2_CHAMPION_NOT_ALLOWED",
        message: `Level 2 champion cards are not allowed in decks: ${cardId}.`,
        cardId
      });
    }
  }

  const championCount = cardIds.reduce((total, cardId) => {
    if (!hasCard(cardId)) {
      return total;
    }
    return total + (isChampionCard(getCardDefinition(cardId)) ? 1 : 0);
  }, 0);

  if (championCount > resolvedRules.maxChampionCards) {
    errors.push({
      code: "TOO_MANY_CHAMPIONS",
      message: `Too many champion cards: ${championCount}/${resolvedRules.maxChampionCards}.`
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function assertValidDeck(
  cardIds: string[],
  rules: Partial<DeckValidationRules> = {}
): void {
  const result = validateDeck(cardIds, rules);
  if (!result.valid) {
    throw new GameValidationError(
      `Invalid deck: ${result.errors.map((error) => error.code).join(", ")}`
    );
  }
}
