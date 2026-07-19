import React from "react";
import { Crown, ScrollText, Shield, Skull, Sparkles, Swords, Zap } from "lucide-react";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/entities/cards";
import type { CardInstance, CardType, UnitInstance, VisualEvent } from "@backend/game/types";
import { useHover } from "../../../contexts/HoverContext";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { CardBack } from "./card-back";

export interface GameCardProps {
  card?: CardInstance;
  unit?: UnitInstance;
  variant?: "default" | "hand";
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  onPreviewChange?: (previewing: boolean) => void;
  visualEvents?: VisualEvent[];
}

const CARD_FRAMES: Record<
  CardType,
  { icon: typeof Crown; label: string }
> = {
  unit: { icon: Skull, label: "Unit" },
  spell: { icon: Sparkles, label: "Spell" },
  champion: { icon: Crown, label: "Champion" }
};

/**
 * Production card contract with the v2 frame, artwork, stat-pip, and champion
 * treatments. Game state interactions remain intentionally owned by this component.
 */
export const GameCard: React.FC<GameCardProps> = ({
  card,
  unit,
  variant = "default",
  selected = false,
  className: cardClassName,
  onClick,
  onPreviewChange,
  visualEvents
}) => {
  const { selectCard, setHoveredCard } = useHover();
  const cardId = unit?.cardId ?? card?.cardId;

  if (!cardId) {
    return null;
  }

  const hoverProps = {
    onMouseEnter: () => {
      if (cardId !== "hidden-card") {
        setHoveredCard(card, unit);
      }
      onPreviewChange?.(true);
    },
    onMouseLeave: () => {
      setHoveredCard(undefined, undefined);
      onPreviewChange?.(false);
    },
    onFocus: () => onPreviewChange?.(true),
    onBlur: () => onPreviewChange?.(false)
  };

  if (cardId === "hidden-card") {
    return <CardBack className={cardClassName} variant={variant} onClick={onClick} {...hoverProps} />;
  }

  const definition = getCardDefinition(cardId);
  const frame = CARD_FRAMES[definition.type];
  const FrameIcon = frame.icon;
  const isChampion = definition.type === "champion";
  const isSpell = definition.type === "spell";
  const attack = unit ? getUnitAttack(unit) : definition.attack;
  const health = unit ? getUnitHealth(unit) : definition.health;
  const maxHealth = unit ? getUnitMaxHealth(unit) : definition.health;
  const description = definition.description?.trim() ?? "";
  const isTriggerActivated = visualEvents?.some((event) => event.type === "TRIGGER_ACTIVATED");
  const floatingEvents = visualEvents?.filter(
    (event) => event.type !== "TRIGGER_ACTIVATED" && event.type !== "DRAW"
  );

  const className = [
    "card-view",
    "game-card-v2",
    "is-clickable",
    variant === "hand" ? "card-view--hand" : "",
    `game-card-v2--${definition.type}`,
    definition.spellSpeed ? `card-view--${definition.spellSpeed}` : "",
    definition.level ? `card-view--level-${definition.level}` : "",
    selected ? "is-selected" : "",
    unit?.attacking ? "is-attacking" : "",
    unit?.blockingUnitId ? "is-blocking" : "",
    isTriggerActivated ? "is-trigger-activated" : "",
    cardClassName
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="game-card-v2__art" style={cardArtworkStyle(definition.imageUrl)} aria-hidden="true" />
      <span className="game-card-v2__art-overlay" aria-hidden="true" />
      {isChampion ? <span className="game-card-v2__champion-flicker" aria-hidden="true" /> : null}

      <span className="game-card-v2__header">
        <FrameIcon className="game-card-v2__type-icon" size={12} aria-hidden="true" />
        <span className="game-card-v2__name">{definition.name}</span>
      </span>

      <span className="game-card-v2__details">
        <span className="game-card-v2__type-label">
          <ScrollText size={9} aria-hidden="true" />
          {frame.label}
        </span>
        {description ? <span className="game-card-v2__description">{description}</span> : null}
      </span>

      <span className="game-card-v2__pip game-card-v2__pip--mana" title="Mana cost">
        <Zap size={11} aria-hidden="true" />
        {definition.cost}
      </span>

      {!isSpell ? (
        <>
          <span className="game-card-v2__pip game-card-v2__pip--attack" title="Attack">
            <Swords size={11} aria-hidden="true" />
            {attack ?? "-"}
          </span>
          <span className="game-card-v2__pip game-card-v2__pip--health" title="Health">
            <Shield size={11} aria-hidden="true" />
            {health ?? "-"}
            {unit && maxHealth !== undefined ? `/${maxHealth}` : ""}
          </span>
        </>
      ) : null}

      {definition.spellSpeed ? (
        <span className="game-card-v2__speed">{definition.spellSpeed}</span>
      ) : null}

      {definition.keywords?.length ? (
        <span className="game-card-v2__keywords">
          {definition.keywords.map((keyword) => (
            <span className="game-card-v2__keyword" key={keyword} title={keyword}>
              {keyword.slice(0, 2)}
            </span>
          ))}
        </span>
      ) : null}

      {unit?.modifiers.length ? (
        <span className="game-card-v2__effects">
          {unit.modifiers.map((modifier) => (
            <span
              className="game-card-v2__effect"
              key={modifier.id}
              title={`${modifier.sourceName} ${formatEffect(modifier.attackDelta, modifier.healthDelta)}`}
            >
              {formatEffect(modifier.attackDelta, modifier.healthDelta)}
            </span>
          ))}
        </span>
      ) : null}

      {floatingEvents?.length ? (
        <span className="floating-events-container">
          {floatingEvents.map((event, index) => (
            <span className={`floating-event ${event.type.toLowerCase()}`} key={index}>
              {formatFloatingEvent(event)}
            </span>
          ))}
        </span>
      ) : null}
    </>
  );

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
};

function cardArtworkStyle(imageUrl?: string): React.CSSProperties | undefined {
  return imageUrl ? { backgroundImage: `url(${imageUrl})` } : undefined;
}

function formatEffect(attackDelta: number, healthDelta: number): string {
  const attack = attackDelta >= 0 ? `+${attackDelta}` : `${attackDelta}`;
  const health = healthDelta >= 0 ? `+${healthDelta}` : `${healthDelta}`;
  return `${attack}|${health}`;
}

function formatFloatingEvent(event: VisualEvent): string {
  switch (event.type) {
    case "DAMAGE":
      return `-${event.amount}`;
    case "HEAL":
      return `+${event.amount}`;
    case "BUFF":
      return `+${event.attackDelta}/+${event.healthDelta}`;
    default:
      return "";
  }
}
