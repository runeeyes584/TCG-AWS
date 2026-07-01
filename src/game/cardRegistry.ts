import cardsJson from "./data/cards.json";
import { CardDefinition, CardType, GameValidationError } from "./types";

const cardMap = new Map<string, CardDefinition>();

for (const card of cardsJson as CardDefinition[]) {
  registerCardDefinition(card);
}

export function assertValidCardType(type: string): asserts type is CardType {
  if (type !== "unit" && type !== "spell" && type !== "champion") {
    throw new GameValidationError(`Invalid card type: ${type}`);
  }
}

export function registerCardDefinition(definition: CardDefinition): CardDefinition {
  assertValidCardType(definition.type);
  cardMap.set(definition.id, definition);
  return definition;
}

export function registerCardDefinitions(definitions: CardDefinition[]): void {
  for (const definition of definitions) {
    registerCardDefinition(definition);
  }
}

export function getCardDefinition(cardId: string): CardDefinition {
  const definition = cardMap.get(cardId);
  if (!definition) {
    throw new GameValidationError(`Card definition not found: ${cardId}`);
  }
  return definition;
}

export function hasCard(cardId: string): boolean {
  return cardMap.has(cardId);
}

export function listCards(): CardDefinition[] {
  return [...cardMap.values()];
}
