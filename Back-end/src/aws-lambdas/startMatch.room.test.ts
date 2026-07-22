import { describe, expect, it } from "vitest";
import { isPublicMatch, normalizeRoomCode } from "./startMatch";

describe("private room input", () => {
  it("normalizes a valid room code", () => {
    expect(normalizeRoomCode("  ab2cd3 ")).toBe("AB2CD3");
  });

  it.each(["", "ABCDE", "ABCDEFG", "ABC0D1", "ABC-23", 123456, null])(
    "rejects invalid room code %j",
    (value) => {
      expect(normalizeRoomCode(value)).toBeUndefined();
    }
  );
});

describe("public matchmaking isolation", () => {
  it("keeps legacy and explicit public matches in the public queue", () => {
    expect(isPublicMatch({})).toBe(true);
    expect(isPublicMatch({ match_type: "PUBLIC" })).toBe(true);
  });

  it("never exposes private rooms to public matchmaking", () => {
    expect(isPublicMatch({ match_type: "PRIVATE" })).toBe(false);
  });
});
