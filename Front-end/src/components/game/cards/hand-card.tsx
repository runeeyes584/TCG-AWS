import React from "react";
import { GameCard } from "./game-card";
import type { CardInstance } from "@backend/game/types";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";

export interface HandCardProps {
  card: CardInstance;
  selected?: boolean;
  hovered?: boolean;
  playable?: boolean;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPreviewChange?: (previewing: boolean) => void;
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
  onPreviewChange
}) => {
  const definition = card?.cardId ? getCardDefinition(card.cardId) : undefined;
  const isSpell = definition?.type === "spell";

  const cardClassName = [
    className,
    playable ? "hand-card--playable" : "",
    isSpell ? "hand-card--spell" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <GameCard
        card={card}
        variant="hand"
        compact
        selected={selected}
        className={cardClassName}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPreviewChange={onPreviewChange}
      />
      {hovered ? (
        <span className="hand-card__hint" role="status">
          {playable ? "Click again to play" : "Card details"}
        </span>
      ) : null}
    </>
  );
};
