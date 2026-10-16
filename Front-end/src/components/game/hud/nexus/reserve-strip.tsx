import type { UnitInstance } from "@backend/game/types";
import { useHover } from "../../../../contexts/HoverContext";
import { reserveChips } from "./reserve";

/**
 * The opponent's waiting row as a short list, where nothing can stand in front of it: each unit with
 * its attack, health and keyword marks (T ough, B arrier, Q uick, O verwhelm). Pointing at a chip
 * (or focusing it) shows the whole card in the card inspector.
 */
export function ReserveStrip({ units }: { units: UnitInstance[] }) {
  const { setHoveredCard } = useHover();
  const chips = reserveChips(units);

  const anchorOf = (element: HTMLElement) => () => {
    const { left, top, width, height } = element.getBoundingClientRect();
    return { x: left, y: top, width, height };
  };

  return (
    <div className="nx-reserve" aria-label={`Reserve: ${chips.length} unit${chips.length === 1 ? "" : "s"} waiting`}>
      <span className="nx-label">Reserve</span>
      <ul className="nx-reserve__list">
        {chips.map(({ unit, name, attack, health, marks }) => (
          <li key={unit.instanceId}>
            <button
              type="button"
              className="nx-chip"
              data-card-ui
              title={name}
              onMouseEnter={(event) => setHoveredCard(undefined, unit, anchorOf(event.currentTarget))}
              onMouseLeave={() => setHoveredCard(undefined, undefined)}
              onFocus={(event) => setHoveredCard(undefined, unit, anchorOf(event.currentTarget))}
              onBlur={() => setHoveredCard(undefined, undefined)}
            >
              <i className="nx-chip__gem" aria-hidden="true" />
              <b className="nx-chip__name">{name}</b>
              <span className="nx-chip__stats">
                {attack}/{health}
              </span>
              {marks.length > 0 ? <em className="nx-chip__marks">{marks.join("")}</em> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
