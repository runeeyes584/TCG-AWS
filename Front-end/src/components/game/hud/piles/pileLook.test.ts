import { describe, expect, it } from "vitest";
import { deckAlert, pileAccent, stackLayers } from "./pileLook";

describe("stackLayers", () => {
  it("draws nothing for an empty pile and a sheet for the first card", () => {
    expect(stackLayers("deck", 0)).toBe(0);
    expect(stackLayers("graveyard", 0)).toBe(0);
    expect(stackLayers("deck", 1)).toBe(1);
    expect(stackLayers("graveyard", 1)).toBe(1);
  });

  it("thickens with the count and stops at the most the pile can show", () => {
    expect(stackLayers("deck", 7)).toBe(2);
    expect(stackLayers("deck", 26)).toBe(5);
    expect(stackLayers("deck", 500)).toBe(5);
    expect(stackLayers("graveyard", 4)).toBe(2);
    expect(stackLayers("graveyard", 500)).toBe(4);
  });

  it("never goes below none", () => {
    expect(stackLayers("deck", -3)).toBe(0);
  });
});

describe("deckAlert", () => {
  it.each([
    [30, "ok"], [6, "ok"], [5, "low"], [3, "low"], [2, "critical"], [0, "critical"]
  ] as const)("is %i cards -> %s", (count, alert) => {
    expect(deckAlert(count)).toBe(alert);
  });
});

describe("pileAccent", () => {
  it("carries the colour of the side while nothing is wrong", () => {
    expect(pileAccent("deck", 20, "viewer")).toEqual({ tone: "viewer", glow: 0, breathes: false });
    expect(pileAccent("deck", 20, "opponent").tone).toBe("opponent");
  });

  it("warns amber on a short deck and red, breathing, on an almost empty one", () => {
    expect(pileAccent("deck", 4, "viewer")).toEqual({ tone: "amber", glow: 0, breathes: false });
    expect(pileAccent("deck", 1, "opponent")).toEqual({ tone: "red", glow: 0, breathes: true });
  });

  it("makes a graveyard glow the more it holds, and turn red when it is a heap", () => {
    expect(pileAccent("graveyard", 0, "viewer").glow).toBe(0);
    expect(pileAccent("graveyard", 2, "viewer")).toEqual({ tone: "viewer", glow: 1, breathes: false });
    expect(pileAccent("graveyard", 6, "opponent")).toEqual({ tone: "opponent", glow: 2, breathes: false });
    expect(pileAccent("graveyard", 12, "viewer")).toEqual({ tone: "red", glow: 3, breathes: false });
  });

  it("does not take a nearly empty graveyard for a warning: only a deck runs out", () => {
    expect(pileAccent("graveyard", 1, "viewer").tone).toBe("viewer");
  });
});
