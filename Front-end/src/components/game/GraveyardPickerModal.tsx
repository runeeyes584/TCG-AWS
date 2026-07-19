"use client";

import { X } from "lucide-react";
import type { GraveyardEntry, GraveyardEntryType, PlayerId } from "@backend/game/types";
import { GameCard } from "./cards/game-card";

interface GraveyardPickerModalProps {
  playerId: PlayerId;
  entries: GraveyardEntry[];
  selectedCardInstanceId?: string;
  canSelect?: boolean;
  allowedTypes?: GraveyardEntryType[];
  onSelectCard?: (cardInstanceId: string) => void;
  onClose: () => void;
}

export function GraveyardPickerModal({
  playerId,
  entries,
  selectedCardInstanceId,
  canSelect = false,
  allowedTypes,
  onSelectCard,
  onClose
}: GraveyardPickerModalProps) {
  const selectableTypes = allowedTypes ?? ["UNIT", "CHAMPION"];
  const selectableEntries = entries.filter(
    (entry) => canSelect && selectableTypes.includes(entry.type)
  );

  const titleId = `graveyard-title-${playerId}`;

  return (
    <div className="graveyard-modal-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={onClose}>
      <div className="graveyard-modal-content graveyard-modal-v2" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id={titleId}>{playerId}&apos;s Graveyard</h2>
          <button className="graveyard-modal__close" type="button" onClick={onClose} aria-label="Close graveyard">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="graveyard-grid">
          {entries.length === 0 ? (
            <div className="empty-message">Graveyard is empty.</div>
          ) : (
            entries.map((entry) => {
              const isSelectable = canSelect && selectableTypes.includes(entry.type);
              return (
              <div
                key={entry.id}
                className={`graveyard-entry ${isSelectable ? "" : "is-disabled"}`}
                aria-disabled={!isSelectable}
              >
                <GameCard
                  card={{
                    instanceId: entry.instanceId,
                    cardId: entry.cardId,
                    ownerId: entry.ownerId
                  }}
                  compact
                  selected={entry.instanceId === selectedCardInstanceId}
                  onClick={
                    isSelectable && onSelectCard
                      ? () => onSelectCard(entry.instanceId)
                      : undefined
                  }
                />
                <div className="cause-tag">
                  {entry.cause} (R{entry.round})
                </div>
              </div>
              );
            })
          )}
        </div>
        {entries.length > 0 && canSelect && selectableEntries.length === 0 ? (
          <div className="empty-message graveyard-empty-targets">
            No compatible graveyard targets.
          </div>
        ) : null}
      </div>
    </div>
  );
}
