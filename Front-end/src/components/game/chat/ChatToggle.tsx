"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "../../ui/button";
import styles from "./ChatToggle.module.css";

interface ChatToggleProps {
  open: boolean;
  unread: number;
  onToggle: () => void;
}

/** Chat icon button for the utility dock. Hover glow and colors come from ui/Button. */
export function ChatToggle({ open, unread, onToggle }: ChatToggleProps) {
  return (
    <span className={styles.wrap} data-chat-toggle="">
      <Button
        data-ui-btn=""
        className={`${styles.button} ${open ? styles.open : ""}`}
        icon={<MessageCircle size={18} />}
        onClick={onToggle}
        aria-label={open ? "Close chat" : "Open chat"}
        aria-pressed={open}
        aria-expanded={open}
        title="Chat"
      />
      {unread > 0 && !open ? (
        <span className={styles.badge} aria-label={`${unread} unread messages`}>
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </span>
  );
}
