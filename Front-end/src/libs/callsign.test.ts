import { describe, expect, it } from "vitest";
import { CALLSIGN_MAX_LENGTH, sanitizeCallsign, validateCallsign } from "./callsign";

describe("sanitizeCallsign", () => {
  it("keeps letters, digits and underscores, and keeps their case", () => {
    expect(sanitizeCallsign("KhangCachua_07")).toBe("KhangCachua_07");
  });

  it("drops spaces and punctuation, also from pasted text", () => {
    expect(sanitizeCallsign("  Kh ang-Ca.chua!@#$%^&*()+=?/,;:'\"")).toBe("KhangCachua");
  });

  it("drops accented and non-Latin letters", () => {
    expect(sanitizeCallsign("Khắng Cá")).toBe("KhngC");
  });

  it("holds at most 20 characters", () => {
    expect(sanitizeCallsign("a".repeat(30))).toHaveLength(CALLSIGN_MAX_LENGTH);
  });

  it("counts only what is kept: punctuation does not use up the 20", () => {
    expect(sanitizeCallsign("!".repeat(10) + "b".repeat(25))).toBe("b".repeat(20));
  });
});

describe("validateCallsign", () => {
  it("accepts 3 to 20 letters, digits and underscores", () => {
    for (const ok of ["abc", "Abc_123", "A".repeat(20)]) expect(validateCallsign(ok)).toBeUndefined();
  });

  it("refuses less than 3 characters", () => {
    for (const short of ["", "a", "ab"]) expect(validateCallsign(short)).toMatch(/at least 3/);
  });

  it("refuses more than 20 characters", () => {
    expect(validateCallsign("a".repeat(21))).toMatch(/at most 20/);
  });

  it("refuses punctuation and spaces", () => {
    for (const bad of ["ab c", "ab-c", "ab.c", "ab!c", "ab@c"]) expect(validateCallsign(bad)).toMatch(/letters, numbers/);
  });
});
