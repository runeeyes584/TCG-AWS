"use client";

import { Shield, Swords, Zap } from "lucide-react";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "../game/cards";
import { CardInstance, UnitInstance } from "../game/types";

interface CardViewProps {
  card?: CardInstance;
  unit?: UnitInstance;
  selected?: boolean;
  onClick?: () => void;
}

export function CardView({ card, unit, selected = false, onClick }: CardViewProps) {
  const definition = unit?.definition ?? card?.definition;
  if (!definition) {
    return null;
  }

  const attack = unit ? getUnitAttack(unit) : definition.attack;
  const health = unit ? getUnitHealth(unit) : definition.health;
  const maxHealth = unit ? getUnitMaxHealth(unit) : definition.health;
  const className = [
    "card-view",
    onClick ? "is-clickable" : "",
    selected ? "is-selected" : "",
    unit?.attacking ? "is-attacking" : "",
    unit?.blockingUnitId ? "is-blocking" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span>
        <span className="card-meta">
          <Zap size={13} aria-hidden="true" /> {definition.cost}
        </span>
        <span className="card-name">{definition.name}</span>
      </span>
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
    </>
  );

  if (!onClick) {
    return <div className={className}>{content}</div>;
  }

  return (
    <button className={className} type="button" onClick={onClick}>
      {content}
    </button>
  );
}

function formatEffect(attackDelta: number, healthDelta: number): string {
  const attack = attackDelta >= 0 ? `+${attackDelta}` : `${attackDelta}`;
  const health = healthDelta >= 0 ? `+${healthDelta}` : `${healthDelta}`;
  return `${attack}|${health}`;
}
