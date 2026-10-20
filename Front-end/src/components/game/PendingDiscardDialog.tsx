"use client";

import type { CardInstance } from "@backend/game/types";
import { BoardDialog } from "../ui/modal";
import { PickerCard } from "./PickerCard";

interface Props {
  playerName: string;
  hand: CardInstance[];
  /** How many cards the hand is brought down to. */
  downTo: number;
  /** The viewer is the player who discards; otherwise they only wait (and cannot see the cards). */
  canControl: boolean;
  onDiscard: (card: CardInstance) => void;
}

/**
 * The hand limit: the player must discard down to the limit, one card at a time, and cannot leave the dialog
 * until they have. It is the dialog of the board in blood red, since a discard cannot be taken back.
 */
export function PendingDiscardDialog({ playerName, hand, downTo, canControl, onDiscard }: Props) {
  const toDiscard = Math.max(0, hand.length - downTo);

  if (!canControl) {
    return (
      <BoardDialog badge="Opponent" title="Discarding" titleId="pending-discard-wait-title" maxWidth={420}>
        Waiting for {playerName} to discard down to {downTo}.
      </BoardDialog>
    );
  }

  return (
    <BoardDialog
      tone="blood"
      badge="Hand limit"
      title={`${playerName}: discard`}
      titleId="pending-discard-title"
      maxWidth={820}
      scrollBody
    >
      <p className="pending-choice-need">
        The attack token changed. Discard {toDiscard} card{toDiscard === 1 ? "" : "s"} to keep {downTo}.
      </p>
      <div className="pending-choice-grid pending-choice-grid--large">
        {hand.map((card) => (
          <PickerCard key={card.instanceId} card={card} label="Discard" onClick={() => onDiscard(card)} />
        ))}
      </div>
    </BoardDialog>
  );
}
