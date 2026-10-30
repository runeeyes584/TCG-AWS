import type { PileId } from "../../phaser/config/pileLayout";
import type { PileKind } from "./pileLook";

/** What the DOM buttons of the piles tell the arena, which paints them. */
export interface PileState {
  kind: PileKind;
  count: number;
  /** The card on top of a graveyard (the one that fell last), for the picture on the pile. */
  topCardId?: string;
  /** Whether a click on it does anything now (a graveyard always opens; a deck draws only where the rules let it). */
  interactive: boolean;
  hover: boolean;
  pressed: boolean;
}

export type PilesState = Record<PileId, PileState>;
