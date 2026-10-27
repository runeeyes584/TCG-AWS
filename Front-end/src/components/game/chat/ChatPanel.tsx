"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, Smile, X } from "lucide-react";
import type { PlayerId } from "@backend/game/types";
import { CHAT_MAX_LENGTH } from "@backend/shared/chat";
import { Button } from "../../ui/button";
import { CornerBrackets } from "../../ui/decor";
import { FormMessage, TextField } from "../../ui/form";
import type { ChatController } from "./chatTypes";
import { EMOJI_GROUPS, QUICK_REACTIONS, isEmojiOnly } from "./emojiSet";
import styles from "./ChatPanel.module.css";

interface ChatPanelProps {
  chat: ChatController;
  localPlayerId?: PlayerId;
  opponentName?: string;
  onClose: () => void;
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" });

export function ChatPanel({ chat, localPlayerId, opponentName, onClose }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [groupId, setGroupId] = useState(EMOJI_GROUPS[0].id);
  const panelRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const group = EMOJI_GROUPS.find((candidate) => candidate.id === groupId) ?? EMOJI_GROUPS[0];

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [chat.messages.length]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // A press outside the panel closes it. The toggle button is excluded so its own click can still close it.
  useEffect(() => {
    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target || panelRef.current?.contains(target) || target.closest("[data-chat-toggle]")) return;
      onClose();
    };
    document.addEventListener("pointerdown", closeOnOutsidePress, true);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePress, true);
  }, [onClose]);

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    const text = draft.trim();
    if (!text) return;
    chat.send(text);
    setDraft("");
    setPickerOpen(false);
  };

  const addEmoji = (emoji: string) => {
    setDraft((current) => (current + emoji).slice(0, CHAT_MAX_LENGTH));
    inputRef.current?.focus();
  };

  return (
    <aside ref={panelRef} className={styles.panel} aria-label="Match chat">
      <CornerBrackets size={9} offset={-1} />
      <header className={styles.header}>
        <span className={styles.title}>
          <MessageCircle size={16} aria-hidden="true" />
          {opponentName ? `Chat · ${opponentName}` : "Match chat"}
        </span>
        <Button size="compact" icon={<X size={14} />} onClick={onClose} aria-label="Close chat" />
      </header>

      <ol ref={listRef} className={styles.messages} aria-live="polite">
        {chat.messages.length === 0 ? (
          <li className={styles.empty}>Say hello, or send a reaction.</li>
        ) : null}
        {chat.messages.map((message) => {
          const mine = message.senderId === localPlayerId;
          return (
            <li key={message.id} className={`${styles.row} ${mine ? styles.mine : styles.theirs}`}>
              {!mine ? <span className={styles.sender}>{message.username}</span> : null}
              <span className={isEmojiOnly(message.text) ? styles.bigEmoji : styles.bubble}>{message.text}</span>
              <time className={styles.time} dateTime={new Date(message.sentAt).toISOString()}>
                {timeFormat.format(message.sentAt)}
              </time>
            </li>
          );
        })}
      </ol>

      {chat.error ? <FormMessage tone="inline">{chat.error}</FormMessage> : null}

      <div className={styles.reactions} aria-label="Quick reactions">
        {QUICK_REACTIONS.map((emoji) => (
          <Button
            key={emoji}
            size="compact"
            className={styles.emojiButton}
            onClick={() => chat.send(emoji)}
            aria-label={`Send ${emoji}`}
          >
            {emoji}
          </Button>
        ))}
      </div>

      {pickerOpen ? (
        <div className={styles.picker}>
          <div className={styles.tabs} role="tablist">
            {EMOJI_GROUPS.map((candidate) => (
              <Button
                key={candidate.id}
                size="compact"
                role="tab"
                aria-selected={candidate.id === group.id}
                aria-label={candidate.label}
                title={candidate.label}
                className={`${styles.emojiButton} ${candidate.id === group.id ? styles.activeTab : ""}`}
                onClick={() => setGroupId(candidate.id)}
              >
                {candidate.icon}
              </Button>
            ))}
          </div>
          <div className={styles.grid}>
            {group.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={styles.emojiCell}
                onClick={() => addEmoji(emoji)}
                aria-label={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form className={styles.composer} onSubmit={submit}>
        <Button
          size="compact"
          className={styles.iconButton}
          icon={<Smile size={18} />}
          onClick={() => setPickerOpen((open) => !open)}
          aria-label="Emoji"
          aria-expanded={pickerOpen}
        />
        <TextField
          ref={inputRef}
          compact
          hideLabel
          label="Message"
          value={draft}
          maxLength={CHAT_MAX_LENGTH}
          autoComplete="off"
          placeholder="Type a message..."
          onChange={(event) => setDraft(event.target.value)}
        />
        <Button
          type="submit"
          size="compact"
          variant="info"
          className={styles.iconButton}
          icon={<Send size={16} />}
          disabled={draft.trim().length === 0}
          aria-label="Send message"
        />
      </form>
    </aside>
  );
}
