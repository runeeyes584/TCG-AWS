import { useEffect, useState } from "react";
import type { PlayerId } from "@backend/game/types";
import type { ChatMessage } from "./chatTypes";

/** Counts opponent messages that arrived while the chat panel was closed. */
export function useChatUnread(messages: ChatMessage[], localPlayerId: PlayerId | undefined, panelOpen: boolean): number {
  const [seenCount, setSeenCount] = useState(0);

  useEffect(() => {
    if (panelOpen || messages.length < seenCount) setSeenCount(messages.length);
  }, [messages.length, panelOpen, seenCount]);

  return messages.slice(seenCount).filter((message) => message.senderId !== localPlayerId).length;
}
