import { describe, expect, it } from "vitest";
import {
  BANNER,
  actorDirection,
  easeOutCubic,
  laneRowsFor,
  lensPoints,
  phaseProgress,
  pulsePositions,
  sampleTargets
} from "./riftMotion";

describe("timeline", () => {
  it("clamps a phase to 0..1", () => {
    expect(phaseProgress(-50, 100, 200)).toBe(0);
    expect(phaseProgress(200, 100, 200)).toBeCloseTo(0.5);
    expect(phaseProgress(900, 100, 200)).toBe(1);
  });

  it("fits every phase inside the banner, text before the break-up, eye closed before the end", () => {
    const end = (p: { from: number; ms: number }) => p.from + p.ms;
    expect(end(BANNER.GATHER) + 0).toBeLessThanOrEqual(BANNER.TEXT_IN.from + BANNER.TEXT_IN.ms);
    expect(end(BANNER.TEXT_IN)).toBeLessThan(BANNER.OUT_FROM);
    expect(end(BANNER.SWEEP)).toBeLessThan(BANNER.OUT_FROM);
    expect(end(BANNER.EYE_CLOSE)).toBeLessThanOrEqual(BANNER.FULL_MS);
    expect(BANNER.EYE_CLOSE.from).toBeGreaterThan(BANNER.OUT_FROM);
  });

  it("eases out from 0 to 1", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe("who acts", () => {
  it("points down to the viewer's half and up to the opponent's", () => {
    expect(actorDirection("you")).toBe(1);
    expect(actorDirection("opponent")).toBe(-1);
  });

  it("lights the lanes of the half of whoever acts", () => {
    expect(laneRowsFor("you")).toEqual(["meWaiting", "meActive"]);
    expect(laneRowsFor("opponent")).toEqual(["oppActive", "oppWaiting"]);
  });
});

describe("lensPoints", () => {
  it("is a closed almond: as wide as 2a, as tall as 2b when open", () => {
    const pts = lensPoints(100, 40, 1, 20);
    expect(pts).toHaveLength(42);
    expect(Math.min(...pts.map((p) => p.x))).toBeCloseTo(-100);
    expect(Math.max(...pts.map((p) => p.x))).toBeCloseTo(100);
    expect(Math.max(...pts.map((p) => p.y))).toBeCloseTo(40);
    expect(Math.min(...pts.map((p) => p.y))).toBeCloseTo(-40);
  });

  it("is a flat line when shut and half height when half open", () => {
    expect(Math.max(...lensPoints(100, 40, 0).map((p) => Math.abs(p.y)))).toBe(0);
    expect(Math.max(...lensPoints(100, 40, 0.5).map((p) => p.y))).toBeCloseTo(20);
  });
});

describe("sampleTargets", () => {
  // A 10 × 4 image whose left half is opaque.
  const image = (w: number, h: number) => {
    const data = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y += 1) for (let x = 0; x < w / 2; x += 1) data[(y * w + x) * 4 + 3] = 255;
    return data;
  };

  it("picks the opaque pixels on the grid", () => {
    const points = sampleTargets(image(10, 4), 10, 4, 1, 100);
    expect(points).toHaveLength(20);
    points.forEach(([x]) => expect(x).toBeLessThan(5));
  });

  it("follows the grid step and thins evenly to the limit", () => {
    expect(sampleTargets(image(10, 4), 10, 4, 2, 100)).toHaveLength(6);
    const thinned = sampleTargets(image(10, 4), 10, 4, 1, 5);
    expect(thinned).toHaveLength(5);
    expect(new Set(thinned.map((p) => p.join(","))).size).toBe(5);
  });
});

describe("pulsePositions", () => {
  it("spreads the pulses over the period and keeps them inside 0..1", () => {
    const at = pulsePositions(1000, 3, 2400);
    expect(at).toHaveLength(3);
    at.forEach((p) => {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThan(1);
    });
    expect(new Set(at.map((p) => p.toFixed(3))).size).toBe(3);
  });

  it("moves outwards with time and wraps", () => {
    expect(pulsePositions(1200, 1, 2400)[0]).toBeCloseTo(0.5);
    expect(pulsePositions(2400, 1, 2400)[0]).toBeCloseTo(0);
  });
});
