import { describe, expect, it } from "vitest";
import { drawerSide, isPlaced, placeWhisper, toScreenRect } from "./inspectorPlacement";

const viewport = { width: 1920, height: 1080 };
const size = { width: 240, height: 90 };

describe("placeWhisper", () => {
  it("stands above the card, centred on it", () => {
    const anchor = { x: 600, y: 600, width: 100, height: 140 };
    expect(placeWhisper(anchor, viewport, size)).toEqual({ x: 530, y: 500, edge: "above" });
  });

  it("goes below the card when there is no room above (the top row)", () => {
    const anchor = { x: 600, y: 60, width: 100, height: 140 };
    expect(placeWhisper(anchor, viewport, size)).toEqual({ x: 530, y: 210, edge: "below" });
  });

  it("stays inside the viewport at the sides", () => {
    expect(placeWhisper({ x: 0, y: 600, width: 100, height: 140 }, viewport, size).x).toBe(12);
    expect(placeWhisper({ x: 1850, y: 600, width: 100, height: 140 }, viewport, size).x).toBe(1920 - 240 - 12);
  });

  it("never covers the card", () => {
    const anchor = { x: 600, y: 600, width: 100, height: 140 };
    const placed = placeWhisper(anchor, viewport, size);
    expect(placed.y + size.height).toBeLessThanOrEqual(anchor.y);
  });
});

describe("isPlaced", () => {
  it("accepts the box of a card that is on the page", () => {
    expect(isPlaced({ x: 300, y: 500, width: 100, height: 140 })).toBe(true);
  });

  it("refuses what is not there: no box, or the empty box of a card that has been removed", () => {
    expect(isPlaced(undefined)).toBe(false);
    expect(isPlaced({ x: 0, y: 0, width: 0, height: 0 })).toBe(false);
    expect(isPlaced({ x: Number.NaN, y: 0, width: 10, height: 10 })).toBe(false);
  });
});

describe("drawerSide", () => {
  it("opens on the side opposite the card", () => {
    expect(drawerSide({ x: 300, y: 500, width: 100, height: 140 }, 1920)).toBe("right");
    expect(drawerSide({ x: 1500, y: 500, width: 100, height: 140 }, 1920)).toBe("left");
  });

  it("opens on the right when it does not know where the card is", () => {
    expect(drawerSide(undefined, 1920)).toBe("right");
  });

  it("always opens on the right for a card in the hand, wherever it is", () => {
    expect(drawerSide({ x: 1500, y: 800, width: 100, height: 140 }, 1920, true)).toBe("right");
    expect(drawerSide({ x: 300, y: 800, width: 100, height: 140 }, 1920, true)).toBe("right");
  });
});

describe("toScreenRect", () => {
  it("maps canvas pixels onto the page", () => {
    expect(
      toScreenRect({ x: 100, y: 50, width: 80, height: 120 }, { x: 10, y: 20, width: 1000, height: 500 }, { width: 2000, height: 1000 })
    ).toEqual({ x: 60, y: 45, width: 40, height: 60 });
  });
});
