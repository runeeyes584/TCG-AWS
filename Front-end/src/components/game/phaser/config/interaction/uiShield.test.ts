import { describe, expect, it } from "vitest";
import { isShielded, isShieldedPointer } from "./uiShield";

const shielded = { closest: (selector: string) => (selector === "[data-ui-shield]" ? {} : null) };
const open = { closest: () => null };

describe("isShielded", () => {
  it("is true for an element in a shielded control", () => {
    expect(isShielded(shielded)).toBe(true);
  });

  it("is false for the canvas, a plain container, or nothing", () => {
    expect(isShielded(open)).toBe(false);
    expect(isShielded(null)).toBe(false);
    expect(isShielded(undefined)).toBe(false);
    expect(isShielded({})).toBe(false);
  });
});

describe("isShieldedPointer", () => {
  it("is true when the click went down, came up or happened on a control", () => {
    expect(isShieldedPointer({ downElement: shielded })).toBe(true);
    expect(isShieldedPointer({ upElement: shielded })).toBe(true);
    expect(isShieldedPointer({ event: { target: shielded } })).toBe(true);
  });

  it("is false for a click on the table", () => {
    expect(isShieldedPointer({ downElement: open, upElement: open, event: { target: open } })).toBe(false);
    expect(isShieldedPointer(undefined)).toBe(false);
  });
});
