import { describe, expect, it } from "vitest";
import { fanSpacing, fanTransform, raisedHitBox, raisedY, restHitBox } from "./handLayout";

const W = 100;

describe("fan", () => {
  it("keeps cards closer as the hand grows, within limits", () => {
    expect(fanSpacing(2, W)).toBe(80);
    expect(fanSpacing(10, W)).toBe(50);
    expect(fanSpacing(0, W)).toBe(80);
  });

  it("puts the middle card in the middle, level and straight", () => {
    expect(fanTransform(1, 3, W, "player")).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it("lifts a raised player card above the bottom of the fan and drops a raised opponent card below the top", () => {
    expect(raisedY("player", W)).toBeLessThan(0);
    expect(raisedY("opponent", W)).toBeGreaterThan(0);
  });
});

describe("resting strips", () => {
  it("tile the fan without a gap or an overlap", () => {
    const total = 5;
    const boxes = Array.from({ length: total }, (_, i) => restHitBox(i, total, W));
    for (let i = 1; i < total; i += 1) {
      expect(boxes[i].left).toBeCloseTo(boxes[i - 1].left + boxes[i - 1].width, 6);
    }
  });

  it("reach out to the edge of the card at the two ends", () => {
    const first = restHitBox(0, 4, W);
    const last = restHitBox(3, 4, W);
    const step = fanSpacing(4, W);
    expect(first.width).toBeCloseTo(W / 2 + step / 2, 6);
    expect(last.width).toBeCloseTo(W / 2 + step / 2, 6);
  });

  it("is the whole card for a hand of one", () => {
    const only = restHitBox(0, 1, W);
    expect(only.left).toBe(-W / 2);
    expect(only.width).toBe(W);
  });
});

describe("raised box", () => {
  it("is wider than the strip and covers it, down to the bottom of the card", () => {
    const total = 5;
    for (let i = 0; i < total; i += 1) {
      const rest = restHitBox(i, total, W);
      const raised = raisedHitBox(i, total, W);
      expect(raised.width).toBeGreaterThan(W);
      const middle = rest.left + rest.width / 2;
      expect(middle).toBeGreaterThanOrEqual(raised.left);
      expect(middle).toBeLessThanOrEqual(raised.left + raised.width);
      expect(raised.bottom).toBeLessThanOrEqual(rest.bottom + 6);
    }
  });

  it("reaches the top of the raised card and goes well above the strip", () => {
    const rest = restHitBox(1, 3, W);
    const raised = raisedHitBox(1, 3, W);
    expect(raised.bottom + raised.height).toBeGreaterThan(rest.bottom + rest.height);
  });
});
