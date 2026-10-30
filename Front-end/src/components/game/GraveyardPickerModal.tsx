"use client";

import { useState, type CSSProperties } from "react";
import clsx from "clsx";
import { Flame, Hourglass, Layers, Skull, Sparkles, Swords, Trash2, type LucideIcon } from "lucide-react";
import type { GraveyardEntry, GraveyardEntryType, PlayerId } from "@backend/game/types";
import { Button } from "../ui/button";
import { BoardDialog } from "../ui/modal";
import { PickerCard } from "./PickerCard";
import {
  FILTER_LABEL,
  activeFilter,
  availableFilters,
  causeInfo,
  filterByType,
  sortNewestFirst,
  typeCounts,
  type CauseIcon,
  type GraveyardFilter
} from "./hud/graveyard/graveyardView";

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

const CAUSE_ICONS: Record<CauseIcon, LucideIcon> = {
  sword: Swords,
  sparkles: Sparkles,
  trash: Trash2,
  hourglass: Hourglass,
  flame: Flame,
  layers: Layers
};

/** How the card came to lie here: what killed or spent it, and in which round. */
function GraveyardTag({ entry }: { entry: GraveyardEntry }) {
  const info = causeInfo(entry.cause);
  const Icon = CAUSE_ICONS[info.icon];
  return (
    <span className={`gy-tag gy-tag--${info.tone}`}>
      <Icon size={11} aria-hidden="true" />
      <b>{info.label}</b>
      <i>R{entry.round}</i>
    </span>
  );
}

/**
 * A graveyard, in the dialog of the board: a crypt that lists its cards from the last to fall, each tagged with what
 * took it, and that can be narrowed to units, champions or spells. Looked at on its own, every card is lit. While a
 * card or an ability is choosing from it, the cards it can take glow gold and the cards it cannot (a spell where only
 * units are allowed) are greyed, say NOT TARGET and cannot be clicked.
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
  const [chosenFilter, setChosenFilter] = useState<GraveyardFilter>("ALL");
  const selectableTypes = allowedTypes ?? ["UNIT", "CHAMPION"];
  const isTarget = (entry: GraveyardEntry) => selectableTypes.includes(entry.type);
  const noCompatibleTarget = canSelect && entries.length > 0 && !entries.some(isTarget);

  const counts = typeCounts(entries);
  const filters = availableFilters(counts);
  const filter = activeFilter(chosenFilter, counts);
  const visible = sortNewestFirst(filterByType(entries, filter));

  return (
    <BoardDialog
      tone="crypt"
      badge={canSelect ? "Choose from the graveyard" : `Crypt · ${entries.length} fallen`}
      title={`${playerName}'s graveyard`}
      titleId={`graveyard-title-${playerId}`}
      maxWidth={860}
      scrollBody
      onClose={onClose}
      actions={
        <Button chamfer size="md" tone="accent" onClick={onClose}>
          {canSelect ? "Cancel" : "Close"}
        </Button>
      }
    >
      <div className="gy-vault">
        {canSelect && selectionPrompt ? <p className="pending-choice-need gy-vault__need">{selectionPrompt}</p> : null}

        {filters.length > 0 ? (
          <div className="gy-vault__filters" role="tablist" aria-label="Filter the graveyard">
            {filters.map((option) => (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={option === filter}
                className={clsx("gy-vault__filter", option === filter && "is-on")}
                onClick={() => setChosenFilter(option)}
              >
                {FILTER_LABEL[option]}
                <b>{counts[option]}</b>
              </button>
            ))}
          </div>
        ) : null}

        {entries.length === 0 ? (
          <div className="gy-vault__empty">
            <Skull size={28} aria-hidden="true" />
            <span>No souls rest here</span>
          </div>
        ) : (
          <div className="pending-choice-grid pending-choice-grid--large gy-vault__grid">
            {visible.map((entry, index) => (
              <PickerCard
                key={entry.id}
                card={{ instanceId: entry.instanceId, cardId: entry.cardId, ownerId: entry.ownerId }}
                label={`${entry.cause} · R${entry.round}`}
                tag={<GraveyardTag entry={entry} />}
                className={clsx("gy-tile", canSelect && isTarget(entry) && "is-eligible")}
                style={{ "--gy-i": Math.min(index, 11) } as CSSProperties}
                blocked={canSelect && !isTarget(entry)}
                selected={entry.instanceId === selectedCardInstanceId}
                onClick={canSelect && onSelectCard ? () => onSelectCard(entry.instanceId) : undefined}
              />
            ))}
          </div>
        )}
        {noCompatibleTarget ? <div className="empty-message">No compatible graveyard targets.</div> : null}
      </div>
    </BoardDialog>
  );
}
