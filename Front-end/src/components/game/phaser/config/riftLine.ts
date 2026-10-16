import type { ArenaProjection, Point } from "./arenaProjection";
import { seededRandom } from "./arenaTheme";

const SEGMENTS = 22;
const SEED = 1337;
/** Amplitude of the crack at rest: a quiet seam, no longer the loudest thing on the table. */
export const RIFT_AMPLITUDE = 0.45;

/**
 * The crack across the middle of the table as a zigzag polyline, left rim to right rim. It is
 * deterministic (fixed seed), so the table, which paints it, and the turn glow, which follows it,
 * draw exactly the same line. `amplitude` scales how far it jumps off the straight rift.
 */
export function riftPolyline(proj: ArenaProjection, amplitude = RIFT_AMPLITUDE): Point[] {
  const rand = seededRandom(SEED);
  const points: Point[] = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const p = proj.project(0.5, -1.02 + (i * 2.04) / SEGMENTS);
    const jitter = (i % 2 ? 1 : -1) * (3 + rand() * 8) * proj.unit * 1.6 * amplitude;
    points.push({ x: p.x, y: p.y + jitter });
  }
  return points;
}

/** The crack's y at a given x, by interpolating between its points (the ends hold their height). */
export function crackYAt(points: Point[], x: number): number {
  if (points.length === 0) return 0;
  if (x <= points[0].x) return points[0].y;
  for (let i = 1; i < points.length; i += 1) {
    if (x <= points[i].x) {
      const t = (x - points[i - 1].x) / (points[i].x - points[i - 1].x || 1);
      return points[i - 1].y + (points[i].y - points[i - 1].y) * t;
    }
  }
  return points[points.length - 1].y;
}
