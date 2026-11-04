import { describe, expect, it } from "vitest";
import { BLOCK_TEXT, playBlockReason, type PlayContext } from "./playBlock";

const base: PlayContext = {
  controllable: true,
  started: true,
  over: false,
  inAction: true,
  hasPriority: true,
  mana: 2,
  spellMana: 0,
  cost: 3,
  isSpell: false
};

describe("playBlockReason", () => {
  it("says mana when the player cannot pay", () => {
    expect(playBlockReason(base)).toBe("mana");
  });

  it("counts spell mana for a spell, not for a unit", () => {
    expect(playBlockReason({ ...base, isSpell: true, spellMana: 1 })).toBe("other");
    expect(playBlockReason({ ...base, isSpell: false, spellMana: 3 })).toBe("mana");
  });

  it("says turn when the opponent has the priority", () => {
    expect(playBlockReason({ ...base, hasPriority: false })).toBe("turn");
  });

  it("says nothing specific outside the action phase, or for a hand that is not theirs", () => {
    expect(playBlockReason({ ...base, inAction: false })).toBe("other");
    expect(playBlockReason({ ...base, controllable: false })).toBe("other");
    expect(playBlockReason({ ...base, over: true })).toBe("other");
  });

  it("has a short line for each reason", () => {
    expect(BLOCK_TEXT.mana).toBe("NOT ENOUGH MANA");
    expect(BLOCK_TEXT.turn.length).toBeGreaterThan(3);
    expect(BLOCK_TEXT.other.length).toBeGreaterThan(3);
  });
});
