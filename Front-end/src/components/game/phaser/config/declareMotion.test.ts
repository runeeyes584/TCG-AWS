import { describe, expect, it } from "vitest";
import type { Quad } from "./arenaProjection";
import { GLIDE_MS, SWEEP_MS, glideOffset, isNewlyDeclared, isRetreating, perimeterPath, sweepWindow } from "./declareMotion";

const square: Quad = [
  { x: 0, y: 100 },
  { x: 100, y: 100 },
  { x: 100, y: 0 },
  { x: 0, y: 0 }
];

describe("isRetreating", () => {
  it("is true for a card that was in a lane and is not any more", () => {
    expect(isRetreating(true, true, false)).toBe(true);
  });

  it("is false for a card seen for the first time, one that stays in its lane, one that stays in the waiting row, or one that was just declared", () => {
    expect(isRetreating(false, true, false)).toBe(false);
    expect(isRetreating(true, true, true)).toBe(false);
    expect(isRetreating(true, false, false)).toBe(false);
    expect(isRetreating(true, false, true)).toBe(false);
  });
});

describe("glide", () => {
  const waiting = { x: 300, y: 620 };
  const active = { x: 300, y: 500 };

  it("starts at the old place, ends at the new one, and eases out", () => {
    expect(glideOffset(waiting, active, 0)).toEqual({ x: 0, y: 120 });
    expect(glideOffset(waiting, active, 1)).toEqual({ x: 0, y: 0 });
    expect(glideOffset(waiting, active, 0.5).y).toBeLessThan(60);
    expect(glideOffset(waiting, active, 3).y).toBe(0);
  });

  it("is quick: a glide and a lap of light both finish within about half a second", () => {
    expect(GLIDE_MS).toBeLessThan(500);
    expect(SWEEP_MS).toBeLessThan(500);
  });
});

describe("isNewlyDeclared", () => {
  it("only for a card seen before that has just joined a lane", () => {
    expect(isNewlyDeclared(true, false, true)).toBe(true);
    expect(isNewlyDeclared(false, false, true)).toBe(false); // first sight, e.g. rejoining a match
    expect(isNewlyDeclared(true, true, true)).toBe(false); // already in the lane: a redraw
    expect(isNewlyDeclared(true, false, false)).toBe(false);
  });
});

describe("perimeterPath", () => {
  it("runs from the start to the end along the edge, through the corners between", () => {
    // Share 0 is the near-left corner; the near edge is the first quarter of the outline.
    const path = perimeterPath(square, 0, 0.5);
    expect(path[0]).toEqual({ x: 0, y: 100 });
    expect(path[path.length - 1]).toEqual({ x: 100, y: 0 });
    expect(path).toContainEqual({ x: 100, y: 100 });
  });

  it("starts and ends part-way along an edge", () => {
    const path = perimeterPath(square, 0.125, 0.375);
    expect(path[0]).toEqual({ x: 50, y: 100 });
    expect(path[path.length - 1]).toEqual({ x: 100, y: 50 });
    expect(path).toContainEqual({ x: 100, y: 100 });
    expect(path).toHaveLength(3);
  });

  it("wraps into a second lap and gives nothing for an empty stretch", () => {
    const path = perimeterPath(square, 0.9, 1.1);
    expect(path[0].x).toBeCloseTo(0);
    expect(path[0].y).toBeCloseTo(60);
    expect(path[path.length - 1].y).toBeCloseTo(100);
    expect(perimeterPath(square, 0.5, 0.5)).toEqual([]);
  });
});

describe("sweepWindow", () => {
  it("has a tail behind the head, which runs once round, and ends", () => {
    expect(sweepWindow(0, 1)).toBeUndefined();
    expect(sweepWindow(1, 1)).toBeUndefined();
    const half = sweepWindow(0.5, 1)!;
    expect(half.to).toBeCloseTo(0.5);
    expect(half.from).toBeCloseTo(0.2);
    expect(sweepWindow(0.1, 1)!.from).toBe(0);
  });

  it("runs twice round for a champion", () => {
    expect(sweepWindow(0.75, 2)!.to).toBeCloseTo(1.5);
  });
});
