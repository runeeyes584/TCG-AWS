"use client";

import { UnitInstance, VisualEvent } from "@backend/game/types";
import { CardView } from "./CardView";

interface BoardViewProps {
  units: UnitInstance[];
  label?: string;
  emptyLabel?: string;
  selectedUnitId?: string;
  selectedUnitIds?: string[];
  onSelectUnit?: (unit: UnitInstance) => void;
  visualEvents?: VisualEvent[];
}

export function BoardView({
  units,
  label = "Board",
  emptyLabel = "No units",
  selectedUnitId,
  selectedUnitIds = [],
  onSelectUnit,
  visualEvents
}: BoardViewProps) {
  return (
    <section className="lane" aria-label="Board">
      <div className="lane-label">{label}</div>
      <div className="card-grid board-grid">
        {Array.from({ length: 6 }).map((_, index) => {
          const unit = units[index];
          return unit ? (
            <CardView
              key={unit.instanceId}
              unit={unit}
              selected={
                unit.instanceId === selectedUnitId ||
                selectedUnitIds.includes(unit.instanceId)
              }
              onClick={onSelectUnit ? () => onSelectUnit(unit) : undefined}
              visualEvents={visualEvents?.filter(e => (e as any).targetId === unit.instanceId || (e as any).sourceId === unit.instanceId)}
            />
          ) : (
            <div className="empty-slot board-empty-slot" key={`empty-${index}`}>
              {index === 0 && units.length === 0 ? emptyLabel : ""}
            </div>
          );
        })}
      </div>
    </section>
  );
}
