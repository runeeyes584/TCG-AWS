"use client";

import type React from "react";
import clsx from "clsx";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import { BoardCard } from "../cards/board-card";

const MAX_ROW_SIZE = 6;

export interface BoardRowProps {
  playerId: PlayerId;
  rowType: "active" | "waiting";
  units: (UnitInstance | undefined)[];
  isEnemy: boolean;
  hasPriority?: boolean;
  selectedUnitIds?: string[];
  isEmptySlotEnabled?: (index: number) => boolean;
  onEmptySlotClick?: (index: number) => void;
  renderUnit?: (unit: UnitInstance, index: number) => React.ReactNode;
}

export function BoardRow({
  playerId,
  rowType,
  units,
  isEnemy,
  hasPriority = false,
  selectedUnitIds = [],
  isEmptySlotEnabled,
  onEmptySlotClick,
  renderUnit
}: BoardRowProps) {
  const isWaiting = rowType === "waiting";
  return (
    <section
      className={clsx(
        "board-row-wrap relative min-w-0 overflow-hidden !bg-black/20 px-3 py-1 transition-colors",
        isWaiting ? "waiting-row-wrap" : "active-row-wrap",
        isEnemy ? "board-row-wrap--enemy" : "board-row-wrap--player",
        hasPriority && "board-row-wrap--priority"
      )}
      aria-label={`${playerId} ${rowType} row`}
    >
      <div
        className={clsx(
          "grid h-full min-h-[64px] grid-cols-6 gap-2",
          isEnemy ? "items-end" : "items-start"
        )}
      >
        {Array.from({ length: MAX_ROW_SIZE }, (_, index) => {
          const unit = units[index];

          if (!unit) {
            const canUseEmptySlot =
              Boolean(onEmptySlotClick) &&
              (isEmptySlotEnabled?.(index) ?? true);

            return (
              <button
                className={clsx(
                  "board-empty-slot !min-h-0 !w-full !rounded-lg !border-2 !border-dashed !bg-transparent !p-0 !shadow-none !opacity-100",
                  "h-full",
                  canUseEmptySlot
                    ? "!border-cyan-400/45 hover:!border-cyan-300 hover:!bg-cyan-400/10"
                    : "!cursor-default !border-white/10"
                )}
                type="button"
                key={`${playerId}-${rowType}-empty-${index}`}
                onClick={() => onEmptySlotClick?.(index)}
                disabled={!canUseEmptySlot}
                aria-label={`Empty slot ${index + 1}`}
              />
            );
          }

          return (
            <div
              className={clsx(
                "relative grid min-h-0 min-w-0 overflow-hidden rounded-lg",
                "h-full"
              )}
              key={unit.instanceId}
            >
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
    </section>
  );
}
