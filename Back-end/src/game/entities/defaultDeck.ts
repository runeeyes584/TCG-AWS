import { CardDefinition, PlayerId } from "../types";
import { createCardInstance } from "./cards";
import { sampleDeckCards } from "./sampleCards";

const DEFAULT_DECK_SIZE = 30;
const DEFAULT_CHAMPION_COUNT = 6;

type CollectibleCardDefinition = CardDefinition & { collectible?: boolean };

export function getDefaultDeckCardIds(): string[] {
  const playableCards = (sampleDeckCards as CollectibleCardDefinition[])
    .filter((card) => card.collectible !== false && card.level !== 2)
    .sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
  const champions = playableCards
    .filter((card) => card.type === "champion")
    .slice(0, DEFAULT_CHAMPION_COUNT);
  const mainCards = playableCards
    .filter((card) => card.type !== "champion")
    .slice(0, DEFAULT_DECK_SIZE - champions.length);

  return [...mainCards, ...champions].slice(0, DEFAULT_DECK_SIZE).map((card) => card.id);
}

export function buildDefaultDeck(playerId: PlayerId) {
  return buildDeckFromCardIds(getDefaultDeckCardIds(), playerId, "starter");
}

export function buildDeckFromCardIds(
  cardIds: string[],
  playerId: PlayerId,
  instancePrefix = "selected"
) {
  return cardIds.map((cardId, index) =>
    createCardInstance(cardId, playerId, `${playerId}-${instancePrefix}-${cardId}-${index}`)
  );
}
