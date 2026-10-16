import type { Point, Quad } from "./arenaProjection";

/** A declared card glides from its slot in the waiting row to its slot in the active row. */
export const GLIDE_MS = 320;
/** The light that burns once round the edge of a declared card takes this long for a lap. */
export const SWEEP_MS = 350;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);

/**
 * Where a gliding card is, as an offset from its resting centre: all the way back at its old place
 * when `progress` is 0, none at all when it is 1 (eased out, so it arrives softly).
 */
export function glideOffset(from: Point, to: Point, progress: number): Point {
  const left = 1 - easeOutCubic(progress);
  return { x: (from.x - to.x) * left, y: (from.y - to.y) * left };
}

/**
 * A card seen before that has just joined a combat lane has been declared. A card seen for the first
 * time (rejoining a match in the middle of a combat) and a card that was already in its lane (a
 * redraw) have not.
 */
export function isNewlyDeclared(known: boolean, wasInLane: boolean, inLane: boolean) {
  return known && !wasInLane && inLane;
}

/**
 * A card that was in a combat lane at the last drawing and is no longer in it has been taken back to the
 * waiting row (the player removed it from the attack or the block, or the combat is over). A card seen for the
 * first time has not been taken back from anywhere.
 */
export function isRetreating(known: boolean, wasInLane: boolean, inLane: boolean) {
  return known && wasInLane && !inLane;
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

/**
 * The part of a card's outline between `from` and `to`, given as the share (0..1, going round) of
 * the outline's length; `to` may pass 1 and wrap into a second lap. `quad` is near-left, near-right,
 * far-right, far-left. The result is a polyline that follows the corners.
 */
export function perimeterPath(quad: Quad, from: number, to: number): Point[] {
  const corners = [quad[0], quad[1], quad[2], quad[3]];
  const lengths = corners.map((p, i) => distance(p, corners[(i + 1) % 4]));
  const total = lengths.reduce((sum, l) => sum + l, 0);
  if (total === 0 || to <= from) return [];

  const pointAt = (share: number): Point => {
    let d = (((share % 1) + 1) % 1) * total;
    for (let i = 0; i < 4; i += 1) {
      if (d <= lengths[i] || i === 3) {
        const t = lengths[i] === 0 ? 0 : Math.min(1, d / lengths[i]);
        const a = corners[i];
        const b = corners[(i + 1) % 4];
        return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      }
      d -= lengths[i];
    }
    return corners[0];
  };

  // The corners that lie strictly between the two ends, in order.
  const path: Point[] = [pointAt(from)];
  let run = 0;
  const cumulative = lengths.map((l) => (run += l) / total);
  for (let lap = Math.floor(from); lap <= Math.floor(to); lap += 1) {
    cumulative.forEach((share, i) => {
      const at = lap + share;
      if (at > from && at < to) path.push(corners[(i + 1) % 4]);
    });
  }
  path.push(pointAt(to));
  return path;
}

/** The lit stretch of the edge for a sweep `progress` (0..1) of `laps` laps: a tail behind the head, which runs round. */
export function sweepWindow(progress: number, laps: number, tail = 0.3): { from: number; to: number } | undefined {
  if (progress <= 0 || progress >= 1) return undefined;
  const head = progress * laps;
  return { from: Math.max(0, head - tail), to: head };
}
