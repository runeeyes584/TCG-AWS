/**
 * Where the cards of a fanned hand lie, and the boxes that take the pointer for them.
 *
 * The cards are animated (they rise, grow and push their neighbours aside), so the pointer must not be tested
 * against them: the thing under a pointer that has not moved would keep changing. Each card gets two boxes of
 * its own instead, fixed by the layout: a strip that it owns while it lies in the fan, and a larger box that
 * it owns once the pointer is on it (the box of the card as it stands raised). Offsets are in px from the middle
 * of the fan (x) and from its bottom edge (y, up is positive).
 */

export type HandSide = "player" | "opponent";

/** How far the bottom of a card hangs below the bottom edge of the fan, in card widths. */
export const HANG = 0.42;
/** Height of a card in card widths. */
export const CARD_RATIO = 1.4;
/** How much a raised card grows. */
export const RAISE_SCALE: Record<HandSide, number> = { player: 1.55, opponent: 1.9 };
/** How far above the bottom edge of the fan the bottom of a raised player card stands, in px. */
export const RAISE_CLEARANCE = 34;

/** The distance between the middles of two neighbouring cards: tighter as the hand grows, so ten cards still fit. */
export function fanSpacing(total: number, cardWidth: number): number {
  return cardWidth * Math.max(0.5, Math.min(0.8, 4.4 / Math.max(total, 1)));
}

export function fanTransform(index: number, total: number, cardWidth: number, side: HandSide) {
  const offset = index - (total - 1) / 2;
  const direction = side === "player" ? 1 : -1;
  return {
    x: offset * fanSpacing(total, cardWidth),
    y: Math.abs(offset) * cardWidth * 0.06 * direction,
    rotate: offset * 4.5 * direction
  };
}

/** Where a raised card goes (a y offset for its slot): raised cards grow from the edge they are anchored to and clear it fully. */
export function raisedY(side: HandSide, cardWidth: number): number {
  return side === "player" ? -cardWidth * HANG - RAISE_CLEARANCE : cardWidth * 0.62 + 16;
}

export interface HitBox {
  /** Offset of the left edge from the middle of the fan. */
  left: number;
  width: number;
  /** Offset of the bottom edge from the bottom of the fan (negative: below it). */
  bottom: number;
  height: number;
}

/** The strip a card owns while it lies in the fan: as wide as the step to its neighbours (the first and last reach out to the edge of the card). */
export function restHitBox(index: number, total: number, cardWidth: number): HitBox {
  const step = fanSpacing(total, cardWidth);
  const { x, y } = fanTransform(index, total, cardWidth, "player");
  const left = index === 0 ? x - cardWidth / 2 : x - step / 2;
  const right = index === total - 1 ? x + cardWidth / 2 : x + step / 2;
  return { left, width: right - left, bottom: -HANG * cardWidth - y, height: CARD_RATIO * cardWidth };
}

/** The box a card owns once the pointer is on it: its raised box, joined to its resting bottom so that no gap opens under it. */
export function raisedHitBox(index: number, total: number, cardWidth: number): HitBox {
  const { x } = fanTransform(index, total, cardWidth, "player");
  const width = cardWidth * RAISE_SCALE.player;
  // Down to where the card lay (a card at the end of the fan lies a little lower), so no gap opens under it.
  const bottom = restHitBox(index, total, cardWidth).bottom;
  const top = RAISE_CLEARANCE + RAISE_SCALE.player * CARD_RATIO * cardWidth;
  return { left: x - width / 2, width, bottom, height: top - bottom };
}
