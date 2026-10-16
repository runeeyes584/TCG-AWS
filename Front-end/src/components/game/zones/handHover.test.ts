import { describe, expect, it } from "vitest";
import { nextHovered } from "./handHover";

describe("nextHovered", () => {
  it("takes the hover to the card that is entered", () => {
    expect(nextHovered(undefined, 2, true)).toBe(2);
    expect(nextHovered(1, 2, true)).toBe(2);
  });

  it("ends the hover when the card that holds it is left", () => {
    expect(nextHovered(2, 2, false)).toBeUndefined();
  });

  it("leaves the hover alone when another card is left, even late", () => {
    // The pointer is on card 2; card 1 reports that it was left (or blurred) after the pointer moved on.
    expect(nextHovered(2, 1, false)).toBe(2);
    expect(nextHovered(undefined, 1, false)).toBeUndefined();
  });
});
