import type { PlayerId } from "../game/types";

export const CHAT_MAX_LENGTH = 300;
export const CHAT_RATE_LIMIT = { maxMessages: 5, windowMs: 5_000 } as const;

export interface ChatMessage {
  id: string;
  senderId: PlayerId;
  username: string;
  text: string;
  sentAt: number;
}

/** Trims the text and returns undefined when it is empty or too long. */
export function normalizeChatText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length === 0 || text.length > CHAT_MAX_LENGTH) return undefined;
  return text;
}

/** Sliding window per key (a socket id), so one player cannot flood the room. */
export function createChatRateLimiter(
  maxMessages: number = CHAT_RATE_LIMIT.maxMessages,
  windowMs: number = CHAT_RATE_LIMIT.windowMs
) {
  const sentAt = new Map<string, number[]>();

  return {
    allow(key: string, now = Date.now()): boolean {
      const recent = (sentAt.get(key) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= maxMessages) {
        sentAt.set(key, recent);
        return false;
      }
      recent.push(now);
      sentAt.set(key, recent);
      return true;
    },
    forget(key: string): void {
      sentAt.delete(key);
    }
  };
}
