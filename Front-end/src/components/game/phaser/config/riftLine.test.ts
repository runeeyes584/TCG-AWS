import { describe, expect, it } from "vitest";
import { createArenaProjection } from "./arenaProjection";
import { RIFT_AMPLITUDE, crackYAt, riftPolyline } from "./riftLine";

const proj = createArenaProjection(1920, 1080, 0.24, 1);

describe("riftPolyline", () => {
  it("is deterministic, so the table and the glow draw the same line", () => {
    expect(riftPolyline(proj)).toEqual(riftPolyline(proj));
  });

  it("runs left to right across the table, 23 points", () => {
    const points = riftPolyline(proj);
    expect(points).toHaveLength(23);
    points.forEach((p, i) => {
      if (i > 0) expect(p.x).toBeGreaterThan(points[i - 1].x);
    });
    expect(points[0].x).toBeLessThan(proj.cx);
    expect(points[points.length - 1].x).toBeGreaterThan(proj.cx);
  });

  it("jumps off the rift by an amount that follows the amplitude", () => {
    const spread = (amplitude: number) => {
      const ys = riftPolyline(proj, amplitude).map((p) => p.y);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(spread(RIFT_AMPLITUDE)).toBeGreaterThan(0);
    expect(spread(1)).toBeGreaterThan(spread(RIFT_AMPLITUDE) * 1.8);
    expect(spread(0)).toBeLessThan(2);
  });
});

describe("crackYAt", () => {
  const points = riftPolyline(proj);

  it("is the height of a point of the crack where it passes through it", () => {
    expect(crackYAt(points, points[5].x)).toBeCloseTo(points[5].y);
  });

  it("lies between its neighbours in between, and holds the end heights beyond the rims", () => {
    const x = (points[3].x + points[4].x) / 2;
    const y = crackYAt(points, x);
    expect(y).toBeGreaterThanOrEqual(Math.min(points[3].y, points[4].y) - 1e-6);
    expect(y).toBeLessThanOrEqual(Math.max(points[3].y, points[4].y) + 1e-6);
    expect(crackYAt(points, -1000)).toBe(points[0].y);
    expect(crackYAt(points, 99999)).toBe(points[points.length - 1].y);
    expect(crackYAt([], 5)).toBe(0);
  });
});
