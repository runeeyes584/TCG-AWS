import { describe, expect, it } from "vitest";
import type { Quad } from "./arenaProjection";
import { growQuad } from "./pickedRing";

const square: Quad = [
  { x: 0, y: 100 },
  { x: 100, y: 100 },
  { x: 100, y: 0 },
  { x: 0, y: 0 }
];

describe("growQuad", () => {
  it("moves every corner away from the middle by the margin", () => {
    const grown = growQuad(square, 10);
    grown.forEach((corner, i) => {
      const before = Math.hypot(square[i].x - 50, square[i].y - 50);
      const after = Math.hypot(corner.x - 50, corner.y - 50);
      expect(after - before).toBeCloseTo(10, 6);
    });
  });

  it("keeps the shape and the order of the corners", () => {
    const grown = growQuad(square, 8);
    expect(grown[0].x).toBeLessThan(0);
    expect(grown[0].y).toBeGreaterThan(100);
    expect(grown[2].x).toBeGreaterThan(100);
    expect(grown[2].y).toBeLessThan(0);
  });

  it("leaves a margin of zero as it is", () => {
    expect(growQuad(square, 0)).toEqual(square);
  });
});
