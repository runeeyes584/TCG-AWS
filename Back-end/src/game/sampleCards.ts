import { listCards } from "./cardRegistry";
import { CardDefinition } from "./types";

export const sampleDeckCards: CardDefinition[] = listCards();

export const sampleUnitCards: CardDefinition[] = sampleDeckCards.filter(
  (card) => card.type === "unit" || card.type === "champion"
);

export const sampleSpellCards: CardDefinition[] = sampleDeckCards.filter(
  (card) => card.type === "spell"
);

export const sampleAbilityCards: CardDefinition[] = sampleDeckCards.filter(
  (card) => Boolean(card.abilities?.length)
);
