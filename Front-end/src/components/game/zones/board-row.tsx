// src/components/game/zones/board-row.tsx
import React from "react";
import { BoardCard } from "../cards/board-card";
import type { PlayerId, UnitInstance } from "@backend/game/types";

export interface BoardRowProps {
  playerId: PlayerId;
  rowType: "active" | "waiting";
  units: (UnitInstance | undefined)[];
  isEnemy: boolean;
  selectedUnitIds?: string[];
  isEmptySlotEnabled?: (index: number) => boolean;
  onEmptySlotClick?: (index: number) => void;
  renderUnit?: (unit: UnitInstance, index: number) => React.ReactNode;
}

export const BoardRow: React.FC<BoardRowProps> = ({
  playerId,
  rowType,
  units,
  isEnemy,
  selectedUnitIds = [],
  isEmptySlotEnabled,
  onEmptySlotClick,
  renderUnit
}) => {
  const isWaiting = rowType === "waiting";
  
  // Outer wrapper classes
  const wrapClass = `battle-row-wrap ${isWaiting ? "waiting-row-wrap" : "active-row-wrap"} ${
    isEnemy
      ? isWaiting ? "opponent-waiting" : "opponent-active"
      : isWaiting ? "own-waiting" : "own-active"
  }`;

  // Inner row class
  const innerRowClass = isEnemy
    ? isWaiting ? "opponent-waiting-row" : "opponent-active-row"
    : isWaiting ? "own-waiting-row" : "own-active-row";

  // Label text
  const labelText = isEnemy
    ? isWaiting ? "Opponent waiting row" : "Opponent active row"
    : isWaiting ? "Your waiting row" : "Your active row";

  return (
    <div className={wrapClass} aria-label={`${playerId} ${rowType} row`}>
      <div className="battle-row-label">
        {labelText}{" "}
        {isWaiting && <strong>{units.filter(Boolean).length}/6</strong>}
      </div>

      <div className={`battle-row ${innerRowClass}`}>
        {Array.from({ length: 6 }).map((_, index) => {
          const unit = units[index];

          if (!unit) {
            const canUseEmptySlot =
              Boolean(onEmptySlotClick) &&
              (isEmptySlotEnabled?.(index) ?? true);

            return (
              <button
                className="battle-slot battle-slot--empty"
                type="button"
                key={`${innerRowClass}-empty-${index}`}
                onClick={() => onEmptySlotClick?.(index)}
                disabled={!canUseEmptySlot}
                aria-label={`Empty slot ${index + 1}`}
              />
            );
          }

          return (
            <div className="battle-slot" key={unit.instanceId}>
              {renderUnit ? (
                renderUnit(unit, index)
              ) : (
                <BoardCard
                  unit={unit}
                  selected={selectedUnitIds.includes(unit.instanceId)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
