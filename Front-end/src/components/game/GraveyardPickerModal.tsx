"use client";

import type { GraveyardEntry, GraveyardEntryType, PlayerId } from "@backend/game/types";
import { Button } from "../ui/button";
import { BoardDialog } from "../ui/modal";
import { PickerCard } from "./PickerCard";

interface GraveyardPickerModalProps {
  playerId: PlayerId;
  playerName: string;
  entries: GraveyardEntry[];
  selectedCardInstanceId?: string;
  canSelect?: boolean;
  allowedTypes?: GraveyardEntryType[];
  selectionPrompt?: string;
  onSelectCard?: (cardInstanceId: string) => void;
  onClose: () => void;
}

/**
 * A graveyard, in the dialog of the board. Looked at on its own, every card is lit. While a card or an ability
 * is choosing from it, the cards it cannot take (a spell where only units are allowed) are greyed, say NOT TARGET
 * and cannot be clicked.
 */
export function GraveyardPickerModal({
  playerId,
  playerName,
  entries,
  selectedCardInstanceId,
  canSelect = false,
  allowedTypes,
  selectionPrompt,
  onSelectCard,
  onClose
}: GraveyardPickerModalProps) {
  const selectableTypes = allowedTypes ?? ["UNIT", "CHAMPION"];
  const isTarget = (entry: GraveyardEntry) => selectableTypes.includes(entry.type);
  const noCompatibleTarget = canSelect && entries.length > 0 && !entries.some(isTarget);

  return (
    <BoardDialog
      badge={canSelect ? "Choose from the graveyard" : "Graveyard"}
      title={`${playerName}'s graveyard`}
      titleId={`graveyard-title-${playerId}`}
      maxWidth={820}
      scrollBody
      onClose={onClose}
      actions={
        <Button chamfer size="md" tone="accent" onClick={onClose}>
          {canSelect ? "Cancel" : "Close"}
        </Button>
      }
    >
      {canSelect && selectionPrompt ? <p className="pending-choice-need">{selectionPrompt}</p> : null}
      {entries.length === 0 ? (
        <div className="empty-message">Graveyard is empty.</div>
      ) : (
        <div className="pending-choice-grid pending-choice-grid--large">
          {entries.map((entry) => (
            <PickerCard
              key={entry.id}
              card={{ instanceId: entry.instanceId, cardId: entry.cardId, ownerId: entry.ownerId }}
              label={`${entry.cause} · R${entry.round}`}
              blocked={canSelect && !isTarget(entry)}
              selected={entry.instanceId === selectedCardInstanceId}
              onClick={canSelect && onSelectCard ? () => onSelectCard(entry.instanceId) : undefined}
            />
          ))}
        </div>
      )}
      {noCompatibleTarget ? <div className="empty-message">No compatible graveyard targets.</div> : null}
    </BoardDialog>
  );
}
