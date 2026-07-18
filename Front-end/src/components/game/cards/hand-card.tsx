import React from "react";
import { GameCard } from "./game-card";
import type { CardInstance } from "@backend/game/types";

export interface HandCardProps {
  card: CardInstance;
  selected?: boolean;
  onClick?: () => void;
  onPreviewChange?: (previewing: boolean) => void;
}

export const HandCard: React.FC<HandCardProps> = ({
  card,
  selected = false,
  onClick,
  onPreviewChange
}) => {
  return (
    <GameCard
      card={card}
      variant="hand"
      selected={selected}
      onClick={onClick}
      onPreviewChange={onPreviewChange}
    />
  );
};
