import { describe, expect, it } from "vitest";
import { CHAT_MAX_LENGTH, createChatRateLimiter, normalizeChatText } from "./chat";

describe("normalizeChatText", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeChatText("  gg   wp \n")).toBe("gg wp");
  });

  it("keeps emoji", () => {
    expect(normalizeChatText("👍🔥")).toBe("👍🔥");
  });

  it("rejects empty, non-string and oversized text", () => {
    expect(normalizeChatText("   ")).toBeUndefined();
    expect(normalizeChatText(42)).toBeUndefined();
    expect(normalizeChatText("a".repeat(CHAT_MAX_LENGTH + 1))).toBeUndefined();
    expect(normalizeChatText("a".repeat(CHAT_MAX_LENGTH))).toBeDefined();
  });
});

describe("createChatRateLimiter", () => {
  it("blocks after the limit and frees the window later", () => {
    const limiter = createChatRateLimiter(2, 1_000);
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 100)).toBe(true);
    expect(limiter.allow("a", 200)).toBe(false);
    expect(limiter.allow("b", 200)).toBe(true);
    expect(limiter.allow("a", 1_001)).toBe(true);
  });

  it("forgets a key", () => {
    const limiter = createChatRateLimiter(1, 1_000);
    limiter.allow("a", 0);
    limiter.forget("a");
    expect(limiter.allow("a", 1)).toBe(true);
  });
});
