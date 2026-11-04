import { describe, expect, it } from "vitest";
import { heldHover, nextHovered } from "./handHover";

describe("nextHovered", () => {
  it("takes the hover to the card that is entered", () => {
    expect(nextHovered(undefined, "c", true)).toBe("c");
    expect(nextHovered("b", "c", true)).toBe("c");
  });

  it("ends the hover when the card that holds it is left", () => {
    expect(nextHovered("c", "c", false)).toBeUndefined();
  });

  it("leaves the hover alone when another card is left, even late", () => {
    // The pointer is on card c; card b reports that it was left (or blurred) after the pointer moved on.
    expect(nextHovered("c", "b", false)).toBe("c");
    expect(nextHovered(undefined, "b", false)).toBeUndefined();
  });
});

describe("heldHover", () => {
  const hand = (...ids: string[]) => ids.map((instanceId) => ({ instanceId }));

  it("keeps the hover of a card still in the hand, wherever it now stands", () => {
    expect(heldHover("c", hand("a", "b", "c"))).toBe("c");
    expect(heldHover("c", hand("c", "a"))).toBe("c");
  });

  it("ends the hover of a card that has left the hand", () => {
    expect(heldHover("c", hand("a", "b"))).toBeUndefined();
  });

  it("never hands the hover to the card drawn into the place of the one played", () => {
    // The last card (c) was hovered and played; next round a card (d) is drawn into its place.
    expect(heldHover("c", hand("a", "b", "d"))).toBeUndefined();
  });

  it("has nothing to keep when nothing is hovered", () => {
    expect(heldHover(undefined, hand("a"))).toBeUndefined();
  });
});
