import { describe, expect, it } from "vitest";
import { isEmojiOnly } from "./emojiSet";

describe("isEmojiOnly", () => {
  it("accepts a few emoji", () => {
    expect(isEmojiOnly("🔥")).toBe(true);
    expect(isEmojiOnly("👍 ❤️")).toBe(true);
  });

  it("rejects text and long emoji runs", () => {
    expect(isEmojiOnly("gg 🔥")).toBe(false);
    expect(isEmojiOnly("🔥🔥🔥🔥")).toBe(false);
    expect(isEmojiOnly("")).toBe(false);
  });
});
