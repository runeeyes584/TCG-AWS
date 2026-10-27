import type { ChatMessage } from "@backend/shared/chat";

export type { ChatMessage };

/** What a game controller offers the board so players can talk during a match. */
export interface ChatController {
  messages: ChatMessage[];
  send: (text: string) => void;
  error?: string;
}
