import type { PlayerId } from "../game/types";

export const CHAT_MAX_LENGTH = 300;
export const CHAT_RATE_LIMIT = { maxMessages: 5, windowMs: 5_000 } as const;

/** What a refused sender is told, the same through the Socket.IO server and through the API Gateway stack. */
export const CHAT_ERRORS = {
  notInMatch: "You are not in a match.",
  waitingForOpponent: "Chat opens once an opponent has joined.",
  matchEnded: "The match has ended.",
  invalidText: `Messages must be between 1 and ${CHAT_MAX_LENGTH} characters.`,
  tooFast: "You are sending messages too fast.",
  unavailable: "Chat is unavailable right now. Please try again."
} as const;

export interface ChatMessage {
  id: string;
  senderId: PlayerId;
  username: string;
  text: string;
  sentAt: number;
}

/** A message as the server relays it: the server, never the sender, gives it its id and time. */
export function createChatMessage(input: {
  matchId: string;
  senderId: PlayerId;
  username: string;
  text: string;
  sentAt?: number;
}): ChatMessage {
  const sentAt = input.sentAt ?? Date.now();
  return {
    id: `${input.matchId}-${sentAt}-${Math.random().toString(36).slice(2, 8)}`,
    senderId: input.senderId,
    username: input.username,
    text: input.text,
    sentAt
  };
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
