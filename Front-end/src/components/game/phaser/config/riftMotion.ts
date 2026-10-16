import type { ArenaRowKey, Point } from "./arenaProjection";

export type TurnOwner = "you" | "opponent";

/** The turn banner's timeline, in ms from the moment the turn changes hands. */
export const BANNER = {
  FULL_MS: 1400,
  FLASH_MS: 420,
  /** The glow flares along the crack; the sigil spins up and the shards launch. */
  FLARE: { from: 0, ms: 220 },
  /** The dark band appears and the pieces fly in to form the text. */
  GATHER: { from: 80, ms: 520 },
  /** Each piece's own flight, so the text weaves in from the middle outwards. */
  PIECE_MS: 380,
  /** The real text fades in over the pieces, which fade out. */
  TEXT_IN: { from: 560, ms: 140 },
  SWEEP: { from: 360, ms: 360 },
  /** The text breaks up again and everything fades. */
  OUT_FROM: 940,
  EYE_OPEN: { from: 200, ms: 320 },
  EYE_CLOSE: { from: 1000, ms: 300 }
} as const;

/** How far along a stretch of the timeline `t` is, 0..1. */
export const phaseProgress = (t: number, from: number, ms: number) =>
  ms <= 0 ? (t >= from ? 1 : 0) : Math.max(0, Math.min(1, (t - from) / ms));

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

/**
 * Screen direction (y) towards the half of the table of whoever acts: the viewer sits at the bottom,
 * the opponent at the top. The crack runs across the table, so this is the way light spills and
 * shards fly, not a way along the crack.
 */
export const actorDirection = (owner: TurnOwner): 1 | -1 => (owner === "you" ? 1 : -1);

/** The lane rows of the half of the table of whoever acts. */
export function laneRowsFor(owner: TurnOwner): ArenaRowKey[] {
  return owner === "you" ? ["meWaiting", "meActive"] : ["oppActive", "oppWaiting"];
}

/**
 * The eye of the rift as a closed polygon around (0, 0): an almond `2a` wide and up to `2b` tall,
 * `open` (0..1) of the way open. Closed (open 0), it is a flat line along the crack.
 */
export function lensPoints(a: number, b: number, open: number, steps = 20): Point[] {
  const height = b * Math.max(0, Math.min(1, open));
  const edge = (sign: 1 | -1) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const x = -a + (2 * a * i) / steps;
      return { x, y: sign * height * (1 - Math.pow(x / a, 2)) };
    });
  return [...edge(-1), ...edge(1).reverse()];
}

/**
 * Where the pieces of a text lie: the pixels of `data` (RGBA, `w` × `h`) that are mostly opaque,
 * on a grid `step` px apart, thinned evenly to at most `max` points.
 */
export function sampleTargets(
  data: ArrayLike<number>,
  w: number,
  h: number,
  step: number,
  max: number
): Array<[number, number]> {
  const found: Array<[number, number]> = [];
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (data[(y * w + x) * 4 + 3] > 128) found.push([x, y]);
    }
  }
  if (found.length <= max) return found;
  return Array.from({ length: max }, (_, i) => found[Math.floor((i * found.length) / max)]);
}

/** Positions (0 at the middle of the crack, 1 at its rim) of `count` pulses spread over one period. */
export function pulsePositions(timeMs: number, count: number, periodMs: number): number[] {
  return Array.from({ length: count }, (_, i) => (timeMs / periodMs + i / count) % 1);
}
