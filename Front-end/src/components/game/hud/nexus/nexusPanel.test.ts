import { describe, expect, it } from "vitest";
import { carryOver, hpDelta, manaCount, manaGemStates, spellCount, spellShardStates } from "./nexusPanel";

describe("manaGemStates", () => {
  it("shows available, spent and locked gems, always ten", () => {
    expect(manaGemStates({ mana: 3, maxMana: 5 })).toEqual([
      "on", "on", "on", "spent", "spent", "locked", "locked", "locked", "locked", "locked"
    ]);
  });

  it("lights the last gems that the previewed card would spend", () => {
    expect(manaGemStates({ mana: 5, maxMana: 8 }, 2).slice(0, 6)).toEqual([
      "on", "on", "on", "preview", "preview", "spent"
    ]);
  });

  it("never previews more than is available", () => {
    expect(manaGemStates({ mana: 1, maxMana: 1 }, 4).filter((s) => s === "preview")).toHaveLength(1);
  });
});

describe("spellShardStates", () => {
  it("fills from the left and previews the cost from the right of the filled ones", () => {
    expect(spellShardStates(2)).toEqual(["on", "on", "empty"]);
    expect(spellShardStates(3, 2)).toEqual(["on", "preview", "preview"]);
    expect(spellShardStates(0)).toEqual(["empty", "empty", "empty"]);
  });
});

describe("carryOver", () => {
  const prev = { mana: 1, maxMana: 4, spellMana: 0 };

  it("does nothing while the round has not changed or no mana is left", () => {
    expect(carryOver(prev, { spellMana: 1 }, false)).toBeNull();
    expect(carryOver({ ...prev, mana: 0 }, { spellMana: 0 }, true)).toBeNull();
  });

  it("turns each left-over gem into a shard, from the last lit gem", () => {
    expect(carryOver({ mana: 2, maxMana: 4, spellMana: 1 }, { spellMana: 3 }, true)).toEqual({
      from: [1, 0],
      to: [1, 2],
      dissolve: undefined
    });
    expect(carryOver(prev, { spellMana: 1 }, true)).toEqual({ from: [0], to: [0], dissolve: undefined });
  });

  it("dissolves what does not fit once the shards are full", () => {
    expect(carryOver({ mana: 4, maxMana: 6, spellMana: 2 }, { spellMana: 3 }, true)).toEqual({
      from: [3],
      to: [2],
      dissolve: 2
    });
    expect(carryOver({ mana: 3, maxMana: 6, spellMana: 3 }, { spellMana: 3 }, true)).toEqual({
      from: [],
      to: [],
      dissolve: 2
    });
  });
});

describe("hpDelta and counts", () => {
  it("reports the change, none on the first reading", () => {
    expect(hpDelta(20, 17)).toBe(-3);
    expect(hpDelta(14, 16)).toBe(2);
    expect(hpDelta(undefined, 20)).toBe(0);
  });

  it("counts against the rules' ceiling", () => {
    expect(manaCount(1)).toBe("1/10");
    expect(spellCount(2)).toBe("2/3");
  });
});
