"use client";
import { useHover } from "../contexts/HoverContext";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/entities/cards";
import { Shield, Swords, X, Zap } from "lucide-react";
import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";

export function CardInspector() {
  const { selectedCard, selectedUnit, selectCard } = useHover();
  const activeCard = selectedCard;
  const activeUnit = selectedUnit;
  const cardId = activeUnit?.cardId ?? activeCard?.cardId;
  const definition = cardId && hasCard(cardId) ? getCardDefinition(cardId) : undefined;

  if (!definition) {
    return null;
  }

  const attack = activeUnit ? getUnitAttack(activeUnit) : definition.attack;
  const health = activeUnit ? getUnitHealth(activeUnit) : definition.health;
  const maxHealth = activeUnit ? getUnitMaxHealth(activeUnit) : definition.health;

  return (
    <div className="card-inspector">
      {definition.imageUrl ? (
        <div
          className="inspector-art"
          style={{ backgroundImage: `url(${definition.imageUrl})` }}
          aria-hidden="true"
        />
      ) : null}
      <div className="inspector-header">
        <h2>{definition.name}</h2>
        <div className="inspector-actions">
          <span className="inspector-cost"><Zap size={14}/> {definition.cost}</span>
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

      {definition.description && (
        <div className="inspector-description">
          {definition.description}
        </div>
      )}

      {definition.keywords && definition.keywords.length > 0 && (
        <div className="inspector-keywords">
          <strong>Keywords:</strong> {definition.keywords.join(", ")}
        </div>
      )}

      {(attack !== undefined || health !== undefined) && (
        <div className="inspector-stat-row">
          <span className="inspector-stat attack"><Swords size={14}/> {attack ?? "-"}</span>
          <span className="inspector-stat health"><Shield size={14}/> {health ?? "-"}{activeUnit && maxHealth !== undefined ? `/${maxHealth}` : ""}</span>
        </div>
      )}

    </div>
  );
}
