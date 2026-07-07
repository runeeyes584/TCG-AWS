"use client";
import { useHover } from "../contexts/HoverContext";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/cards";
import { Shield, Swords, Zap } from "lucide-react";
import { getCardDefinition } from "@backend/game/cardRegistry";

export function CardInspector() {
  const { hoveredCard, hoveredUnit } = useHover();
  const cardId = hoveredUnit?.cardId ?? hoveredCard?.cardId;
  const definition = cardId ? getCardDefinition(cardId) : undefined;

  if (!definition) {
    return (
      <div className="card-inspector empty">
        <p>Hover over a card to view details</p>
      </div>
    );
  }

  const attack = hoveredUnit ? getUnitAttack(hoveredUnit) : definition.attack;
  const health = hoveredUnit ? getUnitHealth(hoveredUnit) : definition.health;
  const maxHealth = hoveredUnit ? getUnitMaxHealth(hoveredUnit) : definition.health;

  return (
    <div className="card-inspector">
      <div className="inspector-header">
        <h2>{definition.name}</h2>
        <span className="card-meta"><Zap size={14}/> {definition.cost}</span>
      </div>
      
      <div className="inspector-type">
        {definition.supertype ? `${definition.supertype} ` : ""}{definition.type}
      </div>

      {(attack !== undefined || health !== undefined) && (
        <div className="card-stats">
          <span className="card-stat attack"><Swords size={14}/> {attack}</span>
          <span className="card-stat health"><Shield size={14}/> {health}{hoveredUnit && maxHealth !== undefined ? `/${maxHealth}` : ""}</span>
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
