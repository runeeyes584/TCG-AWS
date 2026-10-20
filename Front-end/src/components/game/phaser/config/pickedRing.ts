import type { Point, Quad } from "./arenaProjection";

/**
 * The outline of a card that has been picked, a little way out from the card: each corner is moved away from the
 * middle of the card, so the ring stands round it like the margin of a tile in a picking dialog.
 */
export function growQuad(quad: Quad, margin: number): Quad {
  const middle: Point = {
    x: quad.reduce((sum, p) => sum + p.x, 0) / 4,
    y: quad.reduce((sum, p) => sum + p.y, 0) / 4
  };
  const grown = quad.map((p) => {
    const dx = p.x - middle.x;
    const dy = p.y - middle.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return { ...p };
    return { x: p.x + (dx / length) * margin, y: p.y + (dy / length) * margin };
  });
  return grown as Quad;
}
