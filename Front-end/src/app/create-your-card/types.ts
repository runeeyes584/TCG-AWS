import type { CardDefinition } from "../../../../Back-end/src/game/types";

export type GalleryCard = CardDefinition & {
  rarity?:
    | "common"
    | "rare"
    | "epic"
    | "legendary"
    | "champion"
    | string;

  collectible?: boolean;
};

export interface DeckStats {
  champion: number;
  unit: number;
  spell: number;
}

export interface DeckState {
  deckName: string;
  cards: GalleryCard[];
}

export const MAX_DECK_SIZE = 30;
export const MAX_COPY = 3;
export const MAX_CHAMPION = 1;