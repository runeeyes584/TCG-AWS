"use client";

import { X } from "lucide-react";
import type { GraveyardEntry, PlayerId } from "@backend/game/types";
import { CardView } from "./CardView";

interface GraveyardPickerModalProps {
  playerId: PlayerId;
  entries: GraveyardEntry[];
  selectedCardInstanceId?: string;
  canSelect?: boolean;
  allowedTypes?: ("UNIT" | "CHAMPION")[];
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
  return (
    <div className="graveyard-modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="graveyard-modal-content" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{playerId}&apos;s Graveyard</h2>
          <button type="button" onClick={onClose} aria-label="Close graveyard">
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="graveyard-grid">
          {entries.length === 0 ? (
            <div className="empty-message">Graveyard is empty.</div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="graveyard-entry">
                <CardView
                  card={{
                    instanceId: entry.instanceId,
                    cardId: entry.cardId,
                    ownerId: entry.ownerId
                  }}
                  selected={entry.instanceId === selectedCardInstanceId}
                  onClick={
                    canSelect && 
                    entry.type !== "SPELL" && 
                    (!allowedTypes || allowedTypes.includes(entry.type as any)) && 
                    onSelectCard
                      ? () => onSelectCard(entry.instanceId)
                      : undefined
                  }
                />
                <div className="cause-tag">
                  {entry.cause} (R{entry.round})
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
