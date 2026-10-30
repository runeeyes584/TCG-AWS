import { CARD_RATIO } from "../../zones/handLayout";

/**
 * Where the four piles stand: the decks and graveyards of both players, in a column to the left of the table,
 * mirrored about the middle of the table (the opponent's against its far edge, yours against its bottom). One function owns the geometry: the arena
 * paints the piles at these boxes, and the DOM buttons that take the pointer are placed from the same numbers,
 * published as CSS variables. All positions are px in the box of the table (the canvas).
 */

export type PileId = "opponentGraveyard" | "opponentDeck" | "viewerDeck" | "viewerGraveyard";

export const PILE_IDS: readonly PileId[] = ["opponentGraveyard", "opponentDeck", "viewerDeck", "viewerGraveyard"];

export interface PileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PILE_LIMITS = {
  /** A pile is never narrower than this, even where it would have to touch the Turn Rail. */
  minWidth: 40,
  maxWidth: 92,
  /** Between the two piles of one player. */
  gap: 10,
  /** The share of the table's height the two plates may take together: the rest is the open strip between them. */
  fill: 0.88,
  /** Between the outer pile and the edge of the free zone, when there is no table to align with (room for the plate round it). */
  edgePad: 9,
  /** How far the plate of a player reaches round its two piles. */
  platePad: 5,
  /** Between the column and what it must stay clear of. */
  clearance: 10,
  /**
   * The column never starts above this: the menu button is drawn up there (its lower edge is at about y = 60). The
   * bar of the trial, which is only there in the trial, is drawn over the piles when they reach this high.
   */
  topClear: 64
} as const;

/**
 * The Turn Rail's own CSS, copied (`.turn-rail-anchor` in globals.css): it stands `gap` px off the table edge,
 * `clamp(100px, 7.6vw, 120px)` wide, and its frames are sheared to lean with the edge, which pushes its lower left corner
 * out by half its height times the slope. `pileLayout.test.ts` pins this against what the browser measured.
 */
export const RAIL = { gap: 22, minWidth: 100, maxWidth: 120, vw: 0.076, halfHeight: 75 } as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The leftmost x the Turn Rail reaches (its lower left corner), from the table's edge at the rift and how it leans. */
export function railLeftEdge(tableLeftAtRift: number, slope: number, viewportWidth: number): number {
  const width = clamp(RAIL.vw * viewportWidth, RAIL.minWidth, RAIL.maxWidth);
  return tableLeftAtRift - RAIL.gap - width - RAIL.halfHeight * Math.abs(slope);
}

export interface PileLayoutInput {
  /** The free area at the left of the table: its left edge and its top and bottom (the box of the arena grid). */
  zone: { left: number; top: number; bottom: number };
  /**
   * The far and the near edge of the table (its slab, thickness included), in the same px. When given, the plate of each
   * player stands against its edge: the opponent's against the far edge, the player's against the bottom of the slab.
   * Without it the free zone stands in for the table.
   */
  table?: { top: number; bottom: number };
  /** Left edges (x) of what the column must stay clear of: the Turn Rail, the altar of the Nexus of the viewer. */
  keepClearLeft: readonly number[];
}

export type PlateSide = "opponent" | "viewer";

export interface PileLayout {
  cardWidth: number;
  cardHeight: number;
  slots: Record<PileId, PileRect>;
  /** The plate under each player's two piles: it is what shows whose they are, and the open strip between the two is where the divider goes. */
  plates: Record<PlateSide, PileRect>;
  /** The y of the middle of the open strip between the two plates, in whole px: where the divider is drawn. */
  divider: number;
}

/**
 * Four cards' worth of room, sized to the screen. The height comes from the shorter half of the zone (so both players get
 * the same size), the width follows from the card ratio of the hand, and the column is set against the thing it must
 * stay clear of, so it stands as close to the table as it can without touching the Turn Rail or the Nexus.
 */
export function pileLayout({ zone, table, keepClearLeft }: PileLayoutInput): PileLayout {
  const { minWidth, maxWidth, gap, fill, edgePad, platePad, clearance, topClear } = PILE_LIMITS;

  // Where the outer edge of each plate stands: on the edges of the table when it is known, else on the free zone.
  const top = Math.max(table ? table.top : zone.top + edgePad, topClear);
  const bottom = table ? table.bottom : zone.bottom - edgePad;
  const edgeTop = Math.round(top);
  const edgeBottom = Math.floor(bottom);
  // Both players get the same size: each plate takes half of what `fill` leaves of the table's height.
  const plateHeight = ((edgeBottom - edgeTop) * fill) / 2;
  const widthByHeight = Math.floor((plateHeight - platePad * 2 - gap) / 2 / CARD_RATIO);

  const clearRight = keepClearLeft.length > 0 ? Math.min(...keepClearLeft) - clearance : Number.POSITIVE_INFINITY;
  const widthByRoom = Math.floor(clearRight - zone.left - platePad * 2);

  const cardWidth = clamp(Math.min(widthByHeight, widthByRoom, maxWidth), minWidth, maxWidth);
  const cardHeight = Math.round(cardWidth * CARD_RATIO);
  // Rounded down, so that the right edge never passes the clearance.
  const x = Number.isFinite(clearRight) ? Math.max(zone.left + platePad, Math.floor(clearRight - platePad - cardWidth)) : zone.left + platePad;

  const slot = (y: number): PileRect => ({ x, y, width: cardWidth, height: cardHeight });
  // Each player's two piles stand against their own end of the table, so the middle stays open and the two sides are
  // mirrored about the middle of the table: the opponent's graveyard level with the far edge, the player's level with the bottom.
  const opponentGraveyardY = edgeTop + platePad;
  const viewerGraveyardY = edgeBottom - platePad - cardHeight;

  const slots = {
    opponentGraveyard: slot(opponentGraveyardY),
    opponentDeck: slot(opponentGraveyardY + cardHeight + gap),
    viewerDeck: slot(viewerGraveyardY - gap - cardHeight),
    viewerGraveyard: slot(viewerGraveyardY)
  };
  const plate = (first: PileRect, last: PileRect): PileRect => ({
    x: x - platePad,
    y: first.y - platePad,
    width: cardWidth + platePad * 2,
    height: last.y + last.height + platePad - (first.y - platePad)
  });

  return {
    cardWidth,
    cardHeight,
    slots,
    plates: {
      opponent: plate(slots.opponentGraveyard, slots.opponentDeck),
      viewer: plate(slots.viewerDeck, slots.viewerGraveyard)
    },
    divider: Math.round((slots.opponentDeck.y + cardHeight + platePad + (slots.viewerDeck.y - platePad)) / 2)
  };
}
