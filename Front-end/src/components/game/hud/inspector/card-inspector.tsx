"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CardInstance, UnitInstance } from "@backend/game/types";
import { useHover, type AnchorGetter } from "../../../../contexts/HoverContext";
import { describeCard } from "./cardInfo";
import { CardCodex } from "./card-codex";
import { CardWhisper } from "./card-whisper";
import { drawerSide } from "./inspectorPlacement";

const SHOW_DELAY_MS = 120;
const HIDE_DELAY_MS = 60;
const DRAWER_MS = 180;

/** What the codex needs to let the player play a card of their hand from it. */
export interface InspectorPlay {
  isInHand: (card: CardInstance) => boolean;
  canPlay: (card: CardInstance) => boolean;
  /** Why a card that cannot be played is blocked, as the short line to show on the button. */
  blocked?: (card: CardInstance) => string | undefined;
  /** The word on the button: Declare, Cast or Discard. */
  label: (card: CardInstance) => string;
  onPlay: (card: CardInstance) => void;
}

interface Looked {
  card?: CardInstance;
  unit?: UnitInstance;
  anchor?: AnchorGetter;
}

const idOf = (looked?: Looked) => looked?.unit?.instanceId ?? looked?.card?.instanceId;

/**
 * Reading a card has two tiers. Pointing at a card shows a whisper, a small label above it. Pinning it
 * (clicking a card, or right-clicking any card) opens the codex, a drawer with the full text that
 * slides in from the edge opposite the card. Playing a card stays with the hand and the board.
 */
export function CardInspector({ play }: { play?: InspectorPlay }) {
  const { hoveredCard, hoveredUnit, selectedCard, selectedUnit, hoverAnchor, selectedAnchor, selectCard } = useHover();

  const pinned = useMemo<Looked | undefined>(
    () => (selectedCard || selectedUnit ? { card: selectedCard, unit: selectedUnit, anchor: selectedAnchor } : undefined),
    [selectedCard, selectedUnit, selectedAnchor]
  );
  const pointed = useMemo<Looked | undefined>(
    () => (hoveredCard || hoveredUnit ? { card: hoveredCard, unit: hoveredUnit, anchor: hoverAnchor } : undefined),
    [hoveredCard, hoveredUnit, hoverAnchor]
  );

  // ── whisper: waits a moment to appear so sweeping across the cards does not flicker; moving
  // from one card to the next follows at once.
  const [whispered, setWhispered] = useState<Looked>();
  const whisperedRef = useRef<Looked | undefined>(undefined);
  useEffect(() => {
    const apply = (next: Looked | undefined) => {
      whisperedRef.current = next;
      setWhispered(next);
    };
    let timer: number | undefined;
    if (pointed) {
      if (whisperedRef.current) apply(pointed);
      else timer = window.setTimeout(() => apply(pointed), SHOW_DELAY_MS);
    } else if (whisperedRef.current) {
      timer = window.setTimeout(() => apply(undefined), HIDE_DELAY_MS);
    }
    return () => window.clearTimeout(timer);
  }, [pointed]);

  // ── codex: the drawer slides in and out, so the last pinned card stays on show while it leaves.
  const [shown, setShown] = useState<Looked>();
  const [open, setOpen] = useState(false);
  const [side, setSide] = useState<"left" | "right">("right");
  const pinnedId = idOf(pinned);
  useEffect(() => {
    if (pinned) {
      // The edge is chosen as the card is pinned: the one opposite it, and it stays put while it is read.
      setSide(drawerSide(pinned.anchor?.(), window.innerWidth, Boolean(fromHandNow(pinned, play))));
      setShown(pinned);
      const frame = window.requestAnimationFrame(() => setOpen(true));
      return () => window.cancelAnimationFrame(frame);
    }
    setOpen(false);
    const timer = window.setTimeout(() => setShown(undefined), DRAWER_MS);
    return () => window.clearTimeout(timer);
    // The drawer follows the pinned card, not each change of its anchor getter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedId]);

  useEffect(() => {
    if (!pinned) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") selectCard(undefined, undefined);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [pinned, selectCard]);

  const whisperInfo = useMemo(
    () => (whispered && idOf(whispered) !== pinnedId ? describeCard(whispered.card, whispered.unit) : undefined),
    [whispered, pinnedId]
  );
  const codexInfo = useMemo(() => (shown ? describeCard(shown.card, shown.unit) : undefined), [shown]);

  // The button of the codex: only for a card of the player's own hand.
  const handCard = shown ? fromHandNow(shown, play) : undefined;
  const action =
    handCard && play
      ? {
          label: play.label(handCard),
          enabled: play.canPlay(handCard),
          disabledLabel: play.blocked?.(handCard) ?? "Not now",
          onPlay: () => {
            selectCard(undefined, undefined);
            play.onPlay(handCard);
          }
        }
      : undefined;

  return (
    <>
      {whisperInfo && whispered ? <CardWhisper info={whisperInfo} anchor={whispered.anchor} /> : null}
      {codexInfo && shown ? (
        <CardCodex
          card={shown.card}
          unit={shown.unit}
          info={codexInfo}
          side={side}
          open={open}
          action={action}
        />
      ) : null}
    </>
  );
}

/** The card of the player's hand that `looked` is, if it is one (a unit on the table never is). */
function fromHandNow(looked: Looked, play?: InspectorPlay): CardInstance | undefined {
  if (!play || looked.unit || !looked.card) return undefined;
  return play.isInHand(looked.card) ? looked.card : undefined;
}
