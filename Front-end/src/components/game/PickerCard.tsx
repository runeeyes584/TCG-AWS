"use client";

import type { CardInstance, UnitInstance } from "@backend/game/types";
import { GameCard } from "./cards/game-card";

interface PickerCardProps {
  /** A card (of a hand, a deck, a graveyard) or, for a unit of the table, the unit itself. */
  card?: CardInstance;
  unit?: UnitInstance;
  /** The small tag over the card: where it lies, or how it got there. */
  label: string;
  /** The card is shown but cannot be chosen: it sinks into grey, says NOT TARGET across its middle and takes no click. */
  blocked?: boolean;
  selected?: boolean;
  /** What a click does. A card that is only to be looked at passes nothing. */
  onClick?: () => void;
}

const doNothing = () => undefined;

/**
 * A card in a dialog where the player picks from a list (the targets of an ability, the graveyard, the discard).
 * It is shown whole, at the size of the grid it stands in, and says plainly when it cannot be chosen. The whole
 * tile (the tag, the margin round the card, the card) is one button, so the click does not depend on hitting the picture.
 */
export function PickerCard({ card, unit, label, blocked = false, selected = false, onClick }: PickerCardProps) {
  const pickable = !blocked && onClick !== undefined;

  return (
    <div
      className={`pending-choice-card ${blocked ? "is-blocked" : ""} ${pickable ? "is-pickable" : ""}`}
      role={pickable ? "button" : undefined}
      tabIndex={pickable ? 0 : undefined}
      aria-disabled={blocked || undefined}
      onClick={pickable ? onClick : undefined}
      onKeyDown={
        pickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <span className="pending-choice-zone-label">{label}</span>
      <div className="pending-choice-card__face">
        {/* The card itself takes no click (the tile does); a handler keeps it from being pinned to the inspector behind the dialog. */}
        <GameCard card={card} unit={unit} compact selected={selected} onClick={doNothing} visualEvents={[]} />
        {blocked ? <span className="pending-choice-not-target">Not target</span> : null}
      </div>
    </div>
  );
}
