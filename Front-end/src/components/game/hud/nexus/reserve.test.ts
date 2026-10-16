import { describe, expect, it } from "vitest";
import { listCards } from "@backend/game/entities/cardRegistry";
import type { Keyword, UnitInstance } from "@backend/game/types";
import { reserveChips } from "./reserve";

const base = listCards().find((card) => card.type === "unit" && card.attack !== undefined && card.health !== undefined);
const unit = (over: Partial<UnitInstance> = {}) =>
  ({
    instanceId: "u1",
    cardId: base!.id,
    ownerId: "P2",
    attack: base!.attack!,
    maxHealth: base!.health!,
    damage: 0,
    keywords: [] as Keyword[],
    temporaryKeywords: [] as Keyword[],
    modifiers: [],
    exhausted: false,
    boardRow: "WAITING",
    attacking: false,
    ...over
  }) as UnitInstance;

describe("reserveChips", () => {
  it("lists each unit with its name, attack and health", () => {
    const [chip] = reserveChips([unit()]);
    expect(chip.name).toBe(base!.name);
    expect(chip.attack).toBe(base!.attack);
    expect(chip.health).toBe(base!.health);
    expect(chip.marks).toEqual([]);
  });

  it("marks the keywords it has now, own and temporary, in a fixed order", () => {
    const [chip] = reserveChips([unit({ keywords: ["OVERWHELM"], temporaryKeywords: ["TOUGH", "BARRIER"] })]);
    expect(chip.marks).toEqual(["T", "B", "O"]);
  });

  it("follows damage taken, and skips units the card table does not know", () => {
    const [hurt] = reserveChips([unit({ damage: 1 })]);
    expect(hurt.health).toBe(base!.health! - 1);
    expect(reserveChips([unit({ cardId: "no-such-card" })])).toEqual([]);
  });
});
