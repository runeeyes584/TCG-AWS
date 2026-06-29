"use client";

import { UnitInstance } from "../game/types";
import { CardView } from "./CardView";

interface BoardViewProps {
  units: UnitInstance[];
  selectedUnitId?: string;
  selectedUnitIds?: string[];
  onSelectUnit?: (unit: UnitInstance) => void;
}

export function BoardView({
  units,
  selectedUnitId,
  selectedUnitIds = [],
  onSelectUnit
}: BoardViewProps) {
  return (
    <section className="lane" aria-label="Board">
      <div className="lane-label">Board</div>
      <div className="card-grid board-grid">
        {units.length === 0 ? (
          <div className="empty-slot">No units</div>
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
            />
          ))
        )}
      </div>
    </section>
  );
}
