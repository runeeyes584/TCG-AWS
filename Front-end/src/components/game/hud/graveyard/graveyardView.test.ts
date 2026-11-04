import { describe, expect, it } from "vitest";
import type { GraveyardCause, GraveyardEntryType } from "@backend/game/types";
import {
  activeFilter,
  availableFilters,
  causeInfo,
  filterByType,
  graveyardTier,
  sortNewestFirst,
  typeCounts
} from "./graveyardView";

const entries = (...types: GraveyardEntryType[]) => types.map((type, index) => ({ type, id: String(index) }));

describe("graveyardTier", () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 1],
    [4, 2],
    [9, 2],
    [10, 3],
    [40, 3]
  ])("is %i cards -> tier %i", (count, tier) => {
    expect(graveyardTier(count)).toBe(tier);
  });

  it("never goes below empty", () => {
    expect(graveyardTier(-2)).toBe(0);
  });
});

describe("causeInfo", () => {
  it("has a label, an icon and a tone for every cause the engine knows", () => {
    const causes: GraveyardCause[] = ["COMBAT", "SPELL", "EFFECT", "MODIFIER_EXPIRED", "DISCARD", "MILL"];
    for (const cause of causes) {
      const info = causeInfo(cause);
      expect(info.label.length).toBeGreaterThan(0);
      expect(info.icon).toBeTruthy();
      expect(info.tone).toBeTruthy();
    }
  });

  it("marks a death in combat in blood and a spent spell in violet", () => {
    expect(causeInfo("COMBAT").tone).toBe("blood");
    expect(causeInfo("SPELL").tone).toBe("violet");
  });

  it("does not fail on a cause added to the engine later", () => {
    expect(causeInfo("NEW_CAUSE" as GraveyardCause).label).toBe("NEW_CAUSE");
  });
});

describe("sortNewestFirst", () => {
  it("puts the card that fell last first, without changing the list it was given", () => {
    const list = ["a", "b", "c"];

    expect(sortNewestFirst(list)).toEqual(["c", "b", "a"]);
    expect(list).toEqual(["a", "b", "c"]);
  });
});

describe("filters", () => {
  const list = entries("UNIT", "UNIT", "SPELL", "CHAMPION");

  it("counts each kind and the whole", () => {
    expect(typeCounts(list)).toEqual({ ALL: 4, UNIT: 2, CHAMPION: 1, SPELL: 1 });
  });

  it("keeps only the chosen kind, or everything for ALL", () => {
    expect(filterByType(list, "UNIT")).toHaveLength(2);
    expect(filterByType(list, "ALL")).toHaveLength(4);
  });

  it("offers filters only when the graveyard holds at least two kinds of card", () => {
    expect(availableFilters(typeCounts(list))).toEqual(["ALL", "UNIT", "CHAMPION", "SPELL"]);
    expect(availableFilters(typeCounts(entries("UNIT", "UNIT")))).toEqual([]);
    expect(availableFilters(typeCounts([]))).toEqual([]);
    expect(availableFilters(typeCounts(entries("UNIT", "SPELL")))).toEqual(["ALL", "UNIT", "SPELL"]);
  });

  it("falls back to all cards when the chosen kind has none left (one was revived)", () => {
    expect(activeFilter("CHAMPION", typeCounts(entries("UNIT", "SPELL")))).toBe("ALL");
    expect(activeFilter("UNIT", typeCounts(entries("UNIT", "SPELL")))).toBe("UNIT");
  });
});
