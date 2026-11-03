import { describe, expect, it } from "vitest";
import { HOVER_LIFT_RATIO, HOVER_SCALE, hoverPose, liftedRect } from "./hoverLift";

describe("hoverPose", () => {
  it("does nothing at rest and reaches the full pose at 1", () => {
    expect(hoverPose(0, 80)).toEqual({ scale: 1, lift: 0 });
    const full = hoverPose(1, 80);
    expect(full.scale).toBeCloseTo(HOVER_SCALE, 9);
    expect(full.lift).toBeCloseTo(HOVER_LIFT_RATIO * 80, 9);
  });

  it("stays between rest and full, and clamps", () => {
    const half = hoverPose(0.5, 100);
    expect(half.scale).toBeGreaterThan(1);
    expect(half.scale).toBeLessThan(HOVER_SCALE);
    expect(hoverPose(2, 100)).toEqual(hoverPose(1, 100));
    expect(hoverPose(-1, 100)).toEqual({ scale: 1, lift: 0 });
  });

  it("lifts a small card less than a large one", () => {
    expect(hoverPose(1, 60).lift).toBeLessThan(hoverPose(1, 90).lift);
  });

  it("stays light: about 10 px and 14 % on a card 80 px tall", () => {
    const { lift, scale } = hoverPose(1, 80);
    expect(lift).toBeGreaterThanOrEqual(8);
    expect(lift).toBeLessThanOrEqual(12);
    expect(scale).toBeGreaterThanOrEqual(1.12);
    expect(scale).toBeLessThanOrEqual(1.15);
  });
});

describe("liftedRect", () => {
  const rect = { x: 100, y: 200, width: 60, height: 80 };

  it("is the same box at rest", () => {
    expect(liftedRect(rect, 0)).toEqual(rect);
  });

  it("grows about the centre and rises", () => {
    const lifted = liftedRect(rect);
    expect(lifted.width).toBeCloseTo(60 * HOVER_SCALE, 9);
    expect(lifted.x + lifted.width / 2).toBeCloseTo(130, 9);
    expect(lifted.y + lifted.height / 2).toBeLessThan(240);
    expect(lifted.y).toBeLessThan(200);
  });
});
