import { describe, expect, it } from "vitest";
import { listCards } from "@backend/game/entities/cardRegistry";
import { createCardInstance, createUnitInstance } from "@backend/game/entities/cards";
import { KEYWORD_TEXT, describeCard } from "./cardInfo";

const cards = listCards();

describe("describeCard", () => {
  it("reads nothing for a hidden or unknown card", () => {
    expect(describeCard(createCardInstance("hidden-card", "P1", "h"))).toBeUndefined();
    expect(describeCard(createCardInstance("no-such-card-anywhere", "P1", "x"))).toBeUndefined();
    expect(describeCard()).toBeUndefined();
  });

  it("gives a unit its type line, cost and stats", () => {
    const definition = cards.find((c) => c.type === "unit")!;
    const info = describeCard(createCardInstance(definition.id, "P1", "u"))!;
    expect(info.typeLine.startsWith("Unit")).toBe(true);
    expect(info.cost).toBe(definition.cost);
    expect(info.attack).toBe(definition.attack);
    expect(info.health).toBe(definition.health);
  });

  it("names a champion and a spell, and a spell has no stats", () => {
    const champion = cards.find((c) => c.type === "champion")!;
    const spell = cards.find((c) => c.type === "spell")!;
    expect(describeCard(createCardInstance(champion.id, "P1", "c"))!.typeLine.startsWith("Champion")).toBe(true);
    const spellInfo = describeCard(createCardInstance(spell.id, "P1", "s"))!;
    expect(spellInfo.typeLine.startsWith("Spell")).toBe(true);
    expect(spellInfo.attack).toBeUndefined();
    expect(spellInfo.health).toBeUndefined();
  });

  it("reads the stats and keywords of a unit on the board", () => {
    const definition = cards.find((c) => c.type === "unit")!;
    const unit = createUnitInstance(createCardInstance(definition.id, "P1", "u"));
    const withBarrier = { ...unit, keywords: [...unit.keywords, "BARRIER" as const] };
    const info = describeCard(undefined, withBarrier)!;
    expect(info.keywords).toContain("BARRIER");
    expect(info.health).toBeGreaterThan(0);
  });
});

describe("KEYWORD_TEXT", () => {
  it("explains every keyword in a sentence", () => {
    (["TOUGH", "BARRIER", "QUICK_ATTACK", "OVERWHELM"] as const).forEach((keyword) => {
      expect(KEYWORD_TEXT[keyword].length).toBeGreaterThan(10);
    });
  });
});
