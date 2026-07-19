import React from "react";
import { GameCard } from "./game-card";
import type { CardInstance } from "@backend/game/types";

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
  const cardClassName = [
    className,
    playable ? "hand-card--playable" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <GameCard
        card={card}
        variant="hand"
        selected={selected}
        className={cardClassName}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPreviewChange={onPreviewChange}
      />
      {hovered ? (
        <span className="hand-card__hint" role="status">
          {playable ? "Double-click to play" : "Card details"}
        </span>
      ) : null}
    </>
  );
};
