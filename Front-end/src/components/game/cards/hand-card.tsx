import React from "react";
import { GameCard } from "./game-card";
import type { CardInstance } from "@backend/game/types";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { useHover } from "../../../contexts/HoverContext";

export interface HandCardProps {
  card: CardInstance;
  selected?: boolean;
  hovered?: boolean;
  playable?: boolean;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPreviewChange?: (previewing: boolean) => void;
  /** The card was clicked and could not be played: the line to show, and which of two shakes to run (so that a second click shakes again). */
  denied?: { text: string; shake: 0 | 1 };
}

/** Hand-specific interaction affordances layered over the production GameCard. */
export const HandCard: React.FC<HandCardProps> = ({
  card,
  selected = false,
  hovered = false,
  playable = false,
  className,
  onClick,
  onDoubleClick,
  onPreviewChange,
  denied
}) => {
  const { selectCard, selectedCard } = useHover();
  const definition = card?.cardId ? getCardDefinition(card.cardId) : undefined;
  const isSpell = definition?.type === "spell";

  const cardClassName = [
    className,
    playable ? "hand-card--playable" : "",
    isSpell ? "hand-card--spell" : "",
    denied ? `hand-card--denied hand-card--shake-${denied.shake}` : ""
  ]
    .filter(Boolean)
    .join(" ");

  // The button over a raised card: it opens the card's details; clicking the card itself plays it.
  const detailButton = denied ? (
    <span className="hand-card__denied" role="status">
      {denied.text}
    </span>
  ) : hovered ? (
    <button
      type="button"
      className="hand-card__detail"
      data-card-ui
      data-ui-shield=""
      aria-label="Card details"
      onClick={(event) => {
        event.stopPropagation();
        // Pressed again, it closes the details it opened.
        selectCard(selectedCard?.instanceId === card.instanceId ? undefined : card);
      }}
    >
      <span className="hand-card__detail-ring" aria-hidden="true" />
      <span className="hand-card__detail-gem" aria-hidden="true">
        <span className="hand-card__detail-i">i</span>
      </span>
      <span className="hand-card__detail-label" aria-hidden="true">
        Details
      </span>
    </button>
  ) : null;

  return (
    <GameCard
      card={card}
      variant="hand"
      compact
      selected={selected}
      className={cardClassName}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onPreviewChange={onPreviewChange}
      overlay={detailButton}
    />
  );
};
