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
  selectedUnitIds = [],
  isEmptySlotEnabled,
  onEmptySlotClick,
  renderUnit
}: BoardRowProps) {
  const isWaiting = rowType === "waiting";
  const unitCount = units.filter(Boolean).length;
  const label = isEnemy
    ? `Opponent ${rowType} row`
    : `Your ${rowType} row`;

  return (
    <section
      className={clsx(
        "relative min-w-0 overflow-hidden rounded-xl border !bg-black/20 px-3 pb-2 pt-5 transition-colors",
        isWaiting && "waiting-row-wrap",
        isEnemy ? "border-red-400/25" : "border-blue-400/25"
      )}
      aria-label={`${playerId} ${rowType} row`}
    >
      <div className="pointer-events-none absolute left-3 top-1.5 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/55">
          {label}
        </span>
        <span
          className={clsx(
            "size-1.5 rounded-full",
            isEnemy ? "bg-red-400/70" : "bg-blue-400/70"
          )}
          aria-hidden="true"
        />
      </div>

      <span className="pointer-events-none absolute right-3 top-1.5 font-mono text-[10px] text-white/55">
        {unitCount}/{MAX_ROW_SIZE}
      </span>

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
                  "!min-h-0 !w-full !rounded-lg !border !border-dashed !bg-white/[0.02] !p-0 !shadow-none !opacity-100",
                  isWaiting ? "h-[54px]" : "h-full",
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
                isWaiting ? "h-[54px]" : "h-full"
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