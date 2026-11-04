import { graveyardTier, type GraveyardTier } from "../graveyard/graveyardView";

/** How a pile of the table looks for what it holds: how thick the stack is, and the colour and glow it carries. */

export type PileKind = "deck" | "graveyard";
export type PileSide = "viewer" | "opponent";

const MAX_LAYERS = { deck: 5, graveyard: 4 } as const;
const PER_LAYER = { deck: 6, graveyard: 3 } as const;

/** How many sheets of the stack are drawn: one for the first card, then one for every few more. None when empty. */
export function stackLayers(kind: PileKind, count: number): number {
  if (count <= 0) return 0;
  return Math.min(MAX_LAYERS[kind], Math.ceil(count / PER_LAYER[kind]));
}

/** Running out of cards loses the match, so a deck says so before it is empty. */
export type DeckAlert = "ok" | "low" | "critical";

export function deckAlert(count: number): DeckAlert {
  if (count <= 2) return "critical";
  if (count <= 5) return "low";
  return "ok";
}

/** `side` colours: violet for the viewer, rose for the opponent; `amber` and `red` are warnings, whoever's pile it is. */
export type PileTone = PileSide | "amber" | "red";

export interface PileAccent {
  tone: PileTone;
  /** 0 none … 3 strong: how much the pile glows. Only a graveyard glows, by how full it is. */
  glow: GraveyardTier;
  /** Whether the edge breathes: a deck about to run out. */
  breathes: boolean;
}

export function pileAccent(kind: PileKind, count: number, side: PileSide): PileAccent {
  if (kind === "deck") {
    const alert = deckAlert(count);
    if (alert === "critical") return { tone: "red", glow: 0, breathes: true };
    if (alert === "low") return { tone: "amber", glow: 0, breathes: false };
    return { tone: side, glow: 0, breathes: false };
  }
  const tier = graveyardTier(count);
  return { tone: tier === 3 ? "red" : side, glow: tier, breathes: false };
}
