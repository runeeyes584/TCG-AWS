import { describe, expect, it } from "vitest";
import { MAX_DPR, arenaDpr, backingSize, densityOf, logicalSize } from "./arenaScale";

describe("arenaDpr", () => {
  it("follows the screen up to the cap", () => {
    expect(arenaDpr(1)).toBe(1);
    expect(arenaDpr(1.25)).toBe(1.25);
    expect(arenaDpr(1.5)).toBe(1.5);
  });

  it("never goes above the cap or below 1", () => {
    expect(arenaDpr(2)).toBe(MAX_DPR);
    expect(arenaDpr(3)).toBe(MAX_DPR);
    expect(arenaDpr(0.5)).toBe(1);
  });

  it("falls back to 1 when the ratio is unknown", () => {
    expect(arenaDpr(undefined)).toBe(1);
    expect(arenaDpr(Number.NaN)).toBe(1);
    expect(arenaDpr(0)).toBe(1);
  });
});

describe("backingSize", () => {
  it("scales a size to whole canvas pixels, at least one", () => {
    expect(backingSize(980, 1.5)).toBe(1470);
    expect(backingSize(901, 1.5)).toBe(1352);
    expect(backingSize(0, 1.5)).toBe(1);
  });
});

describe("logicalSize and densityOf", () => {
  it("gives back the CSS size of a canvas that is dpr times larger", () => {
    const scale = { width: 1470, height: 1352, zoom: 1 / 1.5 };
    const size = logicalSize(scale);
    expect(size.width).toBeCloseTo(980, 6);
    expect(size.height).toBeCloseTo(901.33, 1);
    expect(densityOf(scale)).toBeCloseTo(1.5, 6);
  });

  it("leaves a plain canvas as it is", () => {
    expect(logicalSize({ width: 800, height: 600, zoom: 1 })).toEqual({ width: 800, height: 600 });
    expect(densityOf({ zoom: 1 })).toBe(1);
  });
});
