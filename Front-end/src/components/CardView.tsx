"use client";

import { Shield, Swords, Zap } from "lucide-react";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/cards";
import { CardInstance, UnitInstance, VisualEvent } from "@backend/game/types";
import { useHover } from "../contexts/HoverContext";
import { getCardDefinition } from "@backend/game/cardRegistry";

interface CardViewProps {
  card?: CardInstance;
  unit?: UnitInstance;
  selected?: boolean;
  onClick?: () => void;
  onPreviewChange?: (previewing: boolean) => void;
  visualEvents?: VisualEvent[];
}

export function CardView({
  card,
  unit,
  selected = false,
  onClick,
  onPreviewChange,
  visualEvents
}: CardViewProps) {
  const { selectCard, setHoveredCard } = useHover();
  const cardId = unit?.cardId ?? card?.cardId;
  if (!cardId) {
    return null;
  }
  const definition = getCardDefinition(cardId);

  const attack = unit ? getUnitAttack(unit) : definition.attack;
  const health = unit ? getUnitHealth(unit) : definition.health;
  const maxHealth = unit ? getUnitMaxHealth(unit) : definition.health;
  const isTriggerActivated = visualEvents?.some(e => e.type === "TRIGGER_ACTIVATED");
  const floatingEvents = visualEvents?.filter(e => e.type !== "TRIGGER_ACTIVATED" && e.type !== "DRAW");

  const className = [
    "card-view",
    "is-clickable",
    `card-view--${definition.type}`,
    definition.spellSpeed ? `card-view--${definition.spellSpeed}` : "",
    definition.level ? `card-view--level-${definition.level}` : "",
    selected ? "is-selected" : "",
    unit?.attacking ? "is-attacking" : "",
    unit?.blockingUnitId ? "is-blocking" : "",
    isTriggerActivated ? "is-trigger-activated" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const style = definition.imageUrl ? { backgroundImage: `url(${definition.imageUrl})` } : undefined;

  const content = (
    <>
      {definition.imageUrl && <span className="card-bg-image" style={style} />}
      <span className="card-rarity-glow" aria-hidden="true" />
      <span className="card-header-bg">
        <span className="card-meta">
          <Zap size={13} aria-hidden="true" /> {definition.cost}
        </span>
        <span className="card-name">{definition.name}</span>
      </span>
      {definition.type === "spell" && definition.spellSpeed ? (
        <span className="spell-speed-badge">{definition.spellSpeed}</span>
      ) : null}
      {definition.keywords?.length ? (
        <span className="keyword-row">
          {definition.keywords.map((keyword) => (
            <span className="keyword-gem" key={keyword} title={keyword}>
              {keyword.slice(0, 2)}
            </span>
          ))}
        </span>
      ) : null}
      <span className="card-stats">
        <span className="card-stat attack" title="Attack">
          <Swords size={14} aria-hidden="true" /> {attack ?? "-"}
        </span>
        <span className="card-stat health" title="Health">
          <Shield size={14} aria-hidden="true" /> {health ?? "-"}
          {unit && maxHealth !== undefined ? `/${maxHealth}` : ""}
        </span>
      </span>
      {unit?.modifiers.length ? (
        <span className="effect-list">
          {unit.modifiers.map((modifier) => (
            <span className="effect-chip" key={modifier.id}>
              {modifier.sourceName}{" "}
              {formatEffect(modifier.attackDelta, modifier.healthDelta)}
            </span>
          ))}
        </span>
      ) : null}
      
      {floatingEvents && floatingEvents.length > 0 ? (
        <span className="floating-events-container">
          {floatingEvents.map((e, idx) => (
            <span key={idx} className={`floating-event ${e.type.toLowerCase()}`}>
              {e.type === "DAMAGE" ? `-${e.amount}` : e.type === "HEAL" ? `+${e.amount}` : e.type === "BUFF" ? `+${e.attackDelta}/+${e.healthDelta}` : ""}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );

  const hoverProps = {
    onMouseEnter: () => {
      setHoveredCard(card, unit);
      onPreviewChange?.(true);
    },
    onMouseLeave: () => {
      setHoveredCard(undefined, undefined);
      onPreviewChange?.(false);
    },
    onFocus: () => onPreviewChange?.(true),
    onBlur: () => onPreviewChange?.(false)
  };
  const handleClick = () => {
    selectCard(card, unit);
    onClick?.();
  };

  if (!onClick) {
    return (
      <div
        className={className}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleClick();
          }
        }}
        {...hoverProps}
      >
        {content}
      </div>
    );
  }

  return (
    <button className={className} type="button" onClick={handleClick} {...hoverProps}>
      {content}
    </button>
  );
}

function formatEffect(attackDelta: number, healthDelta: number): string {
  const attack = attackDelta >= 0 ? `+${attackDelta}` : `${attackDelta}`;
  const health = healthDelta >= 0 ? `+${healthDelta}` : `${healthDelta}`;
  return `${attack}|${health}`;
}
