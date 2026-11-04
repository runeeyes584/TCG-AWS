import { describe, expect, it } from "vitest";
import { listCards } from "@backend/game/entities/cardRegistry";
import { createCardInstance, createUnitInstance } from "@backend/game/entities/cards";
import type { UnitInstance, UnitModifier } from "@backend/game/types";
import { statTrends, tintDescription, trendKey } from "./cardStats";

const cards = listCards();
const definition = cards.find((c) => c.type === "unit" && (c.attack ?? 0) > 0 && (c.health ?? 0) > 1)!;

const freshUnit = (): UnitInstance => createUnitInstance(createCardInstance(definition.id, "P1", "u"));

const modifier = (attackDelta: number, healthDelta: number): UnitModifier => ({
  id: "m",
  sourceCardId: "x",
  sourceName: "x",
  type: attackDelta < 0 || healthDelta < 0 ? "DEBUFF" : "BUFF",
  attackDelta,
  healthDelta,
  duration: "PERMANENT",
  createdRound: 1,
  createdTurn: 1
});

describe("statTrends", () => {
  it("has none for a card in hand or a unit that is as printed", () => {
    expect(statTrends(definition)).toEqual({});
    expect(statTrends(definition, freshUnit())).toEqual({});
  });

  it("points up for a buff and down for a debuff", () => {
    const unit = { ...freshUnit(), modifiers: [modifier(2, 1)] };
    expect(statTrends(definition, unit)).toEqual({ attack: "up", health: "up" });
    const weak = { ...freshUnit(), modifiers: [modifier(-1, -1)] };
    expect(statTrends(definition, weak)).toEqual({ attack: "down", health: "down" });
  });

  it("points health down for a wounded unit, even if its maximum is buffed", () => {
    const wounded = { ...freshUnit(), damage: 1 };
    expect(statTrends(definition, wounded).health).toBe("down");
    const buffedAndWounded = { ...freshUnit(), modifiers: [modifier(0, 3)], damage: 1 };
    expect(statTrends(definition, buffedAndWounded).health).toBe("down");
  });

  it("names the trend in a cache key", () => {
    expect(trendKey({})).toBe("--");
    expect(trendKey({ attack: "up", health: "down" })).toBe("updown");
  });
});

const joined = (text: string) => tintDescription(text).map((p) => p.text).join("");
const toned = (text: string) => tintDescription(text).filter((p) => p.tone).map((p) => `${p.text}:${p.tone}`);

describe("tintDescription", () => {
  it("keeps the text whole", () => {
    ["", "Play: draw 1.", "Grant an ally +1|+0 this round.", "(-1 Attack and -1 Health to a random enemy) [Debuff]"].forEach((t) =>
      expect(joined(t)).toBe(t)
    );
  });

  it("tints each signed number by its own sign and leaves zero alone", () => {
    expect(toned("I gain +1|+0 this round.")).toEqual(["+1:up"]);
    expect(toned("Give an enemy -2|-1 this round.")).toEqual(["-2:down", "-1:down"]);
    expect(toned("Grant +0|+2 this round.")).toEqual(["+2:up"]);
    expect(toned("all allies gain +2/+2")).toEqual(["+2:up", "+2:up"]);
  });

  it("takes the stat word along and tints the tags", () => {
    expect(toned("(-1 attack)")).toEqual(["-1 attack:down"]);
    expect(toned("a curse [Debuff]. A blessing [Buff].")).toEqual(["[Debuff]:down", "[Buff]:up"]);
  });

  it("does not tint a number glued to a word", () => {
    expect(toned("Round-1 ends. Deal 1.")).toEqual([]);
  });

  it("reads every real card without losing a character", () => {
    cards.forEach((card) => {
      if (card.description) expect(joined(card.description)).toBe(card.description);
    });
  });
});
