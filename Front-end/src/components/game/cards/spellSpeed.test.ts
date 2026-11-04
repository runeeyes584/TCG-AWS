import { describe, expect, it } from "vitest";
import { listCards } from "@backend/game/entities/cardRegistry";
import { SPEED_STYLE, speedOf } from "./spellSpeed";

const cards = listCards();

describe("speedOf", () => {
  it("gives a spell its speed, and slow when it has none", () => {
    expect(speedOf({ type: "spell", spellSpeed: "burst" })).toBe("burst");
    expect(speedOf({ type: "spell" })).toBe("slow");
  });

  it("gives units and champions none", () => {
    expect(speedOf({ type: "unit", spellSpeed: "fast" })).toBeUndefined();
    expect(speedOf({ type: "champion" })).toBeUndefined();
  });

  it("covers every spell of the game", () => {
    cards
      .filter((card) => card.type === "spell")
      .forEach((card) => expect(SPEED_STYLE[speedOf(card)!]).toBeDefined());
  });
});

describe("SPEED_STYLE", () => {
  it("gives each speed its own colour, shape and sentence", () => {
    const styles = Object.values(SPEED_STYLE);
    expect(new Set(styles.map((s) => s.color)).size).toBe(3);
    expect(new Set(styles.map((s) => s.glyph)).size).toBe(3);
    styles.forEach((s) => expect(s.hint.length).toBeGreaterThan(10));
  });
});
