import { describe, expect, it } from "vitest";
import {
  FX_BANISH,
  FX_ENTER,
  FX_MS,
  FX_REBIRTH,
  FX_REVIVE,
  bezierPoint,
  easeIn,
  easeInOut,
  easeOut,
  moteAt,
  moteStart,
  spiralPoint,
  stage
} from "./graveyardFxMotion";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);

describe("easings", () => {
  it.each([easeIn, easeOut, easeInOut])("run from 0 to 1 and stay inside it", (ease) => {
    close(ease(0), 0);
    close(ease(1), 1);
    expect(ease(-3)).toBe(0);
    close(ease(9), 1);
  });

  it("starts slowly when falling and quickly when rising", () => {
    expect(easeIn(0.5)).toBeLessThan(0.5);
    expect(easeOut(0.5)).toBeGreaterThan(0.5);
  });
});

describe("stage", () => {
  it("is 0 before it begins, 1 after it ends, and in between while it runs", () => {
    expect(stage(50, 100, 200)).toBe(0);
    expect(stage(200, 100, 200)).toBe(0.5);
    expect(stage(400, 100, 200)).toBe(1);
  });

  it("handles a stage with no length", () => {
    expect(stage(10, 20, 0)).toBe(0);
    expect(stage(30, 20, 0)).toBe(1);
  });
});

describe("bezierPoint", () => {
  const from = { x: 0, y: 100 };
  const to = { x: 200, y: 100 };

  it("starts at the pile and ends at the target", () => {
    expect(bezierPoint(from, to, 40, 0)).toEqual(from);
    expect(bezierPoint(from, to, 40, 1)).toEqual(to);
  });

  it("goes straight with no bow and bows to one side with one", () => {
    close(bezierPoint(from, to, 0, 0.5).y, 100);
    // Going right (+x), a positive bow is to the left of the way, which is up on screen (smaller y).
    expect(bezierPoint(from, to, 40, 0.5).y).toBeLessThan(100);
    expect(bezierPoint(from, to, -40, 0.5).y).toBeGreaterThan(100);
  });

  it("does not fail when the pile and the target are the same point", () => {
    const point = bezierPoint(from, from, 40, 0.5);
    expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
  });
});

describe("spiralPoint", () => {
  const center = { x: 10, y: 20 };

  it("begins `radius` away and ends at the centre", () => {
    const start = spiralPoint(center, 30, 2, 0, 0);
    close(Math.hypot(start.x - center.x, start.y - center.y), 30);
    const end = spiralPoint(center, 30, 2, 0, 1);
    close(end.x, center.x);
    close(end.y, center.y);
  });

  it("closes in as it winds", () => {
    const distance = (p: number) => {
      const point = spiralPoint(center, 30, 2, 0, p);
      return Math.hypot(point.x - center.x, point.y - center.y);
    };
    expect(distance(0.25)).toBeGreaterThan(distance(0.5));
    expect(distance(0.5)).toBeGreaterThan(distance(0.75));
  });
});

describe("motes", () => {
  const center = { x: 100, y: 100 };

  it("wait above the pile, spread from left to right", () => {
    const first = moteStart(center, 0, 8, 46);
    const last = moteStart(center, 7, 8, 46);
    expect(first.y).toBeLessThan(center.y);
    expect(last.y).toBeLessThan(center.y);
    expect(first.x).toBeLessThan(last.x);
  });

  it("fall into the pile", () => {
    const start = moteStart(center, 3, 8, 46);
    expect(moteAt(center, 3, 8, 46, 0)).toEqual(start);
    expect(moteAt(center, 3, 8, 46, 1)).toEqual(center);
  });

  it("stand in one place when there is a single mote", () => {
    expect(Number.isFinite(moteStart(center, 0, 1, 46).x)).toBe(true);
  });
});

describe("timings", () => {
  it("cover every stage of each effect", () => {
    expect(FX_MS.ENTER).toBeGreaterThanOrEqual(FX_ENTER.gulp[0] + FX_ENTER.gulp[1]);
    expect(FX_MS.REVIVE).toBeGreaterThanOrEqual(FX_REVIVE.burst[0] + FX_REVIVE.burst[1]);
    expect(FX_MS.REBIRTH).toBeGreaterThanOrEqual(FX_REBIRTH.burst[0] + FX_REBIRTH.burst[1]);
    expect(FX_MS.BANISH).toBeGreaterThanOrEqual(FX_BANISH.close[0] + FX_BANISH.close[1]);
  });

  it("let a revived soul land before its burst begins", () => {
    expect(FX_REVIVE.flight[0] + FX_REVIVE.flight[1]).toBeLessThanOrEqual(FX_REVIVE.burst[0]);
  });
});
