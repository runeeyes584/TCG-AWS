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
        {units.length === 0 ? (
          <div className="empty-slot">{emptyLabel}</div>
        ) : (
          units.map((unit) => (
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
          ))
        )}
      </div>
    </section>
  );
}
