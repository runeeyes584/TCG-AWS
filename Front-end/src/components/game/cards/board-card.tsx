import React from "react";
import { GameCard } from "./game-card";
import type { UnitInstance, VisualEvent } from "@backend/game/types";

export interface BoardCardProps {
  unit: UnitInstance;
  selected?: boolean;
  onClick?: () => void;
  visualEvents?: VisualEvent[];
  damagePreview?: string;
}

export const BoardCard: React.FC<BoardCardProps> = ({
  unit,
  selected = false,
  onClick,
  visualEvents,
  damagePreview
}) => {
  return (
    <div className="active-unit-card">
      <GameCard
        unit={unit}
        selected={selected}
        onClick={onClick}
        visualEvents={visualEvents}
      />
      {damagePreview && <div className="damage-preview">{damagePreview}</div>}
    </div>
  );
};
