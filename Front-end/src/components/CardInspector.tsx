"use client";
import { useHover } from "../contexts/HoverContext";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/cards";
import { Shield, Swords, X, Zap } from "lucide-react";
import { getCardDefinition } from "@backend/game/cardRegistry";

export function CardInspector() {
  const { selectedCard, selectedUnit, selectCard } = useHover();
  const activeCard = selectedCard;
  const activeUnit = selectedUnit;
  const cardId = activeUnit?.cardId ?? activeCard?.cardId;
  const definition = cardId ? getCardDefinition(cardId) : undefined;

  if (!definition) {
    return null;
  }

  const attack = activeUnit ? getUnitAttack(activeUnit) : definition.attack;
  const health = activeUnit ? getUnitHealth(activeUnit) : definition.health;
  const maxHealth = activeUnit ? getUnitMaxHealth(activeUnit) : definition.health;

  return (
    <div className="card-inspector">
      <div className="inspector-header">
        <h2>{definition.name}</h2>
        <div className="inspector-actions">
          <span className="card-meta"><Zap size={14}/> {definition.cost}</span>
          <button
            type="button"
            className="panel-close"
            onClick={() => selectCard(undefined, undefined)}
            aria-label="Close card details"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      
      <div className="inspector-type">
        {definition.supertype ? `${definition.supertype} ` : ""}{definition.type}
      </div>

      {(attack !== undefined || health !== undefined) && (
        <div className="card-stats">
          <span className="card-stat attack"><Swords size={14}/> {attack}</span>
          <span className="card-stat health"><Shield size={14}/> {health}{activeUnit && maxHealth !== undefined ? `/${maxHealth}` : ""}</span>
        </div>
      )}

      {definition.description && (
        <div className="inspector-description" style={{ marginTop: '8px', fontStyle: 'italic', color: '#ccc' }}>
          {definition.description}
        </div>
      )}

      {definition.keywords && definition.keywords.length > 0 && (
        <div className="inspector-keywords">
          <strong>Keywords:</strong> {definition.keywords.join(", ")}
        </div>
      )}

      {definition.effects && definition.effects.length > 0 && (
        <div className="inspector-effects">
          <strong>Effects:</strong>
          <ul>
            {definition.effects.map((eff, i) => (
              <li key={i}>{eff.type} {eff.target && `(Target: ${eff.target})`} {"amount" in eff && `(${(eff as any).amount})`} {"count" in eff && `(${(eff as any).count})`}</li>
            ))}
          </ul>
        </div>
      )}

      {definition.triggers && definition.triggers.length > 0 && (
        <div className="inspector-triggers">
          <strong>Triggers:</strong>
          <ul>
            {definition.triggers.map((trig, i) => (
              <li key={i}>
                <em>{trig.event}</em>: {trig.effects.map(e => e.type).join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
