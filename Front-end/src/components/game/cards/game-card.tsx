import React from "react";
import Tilt from "react-parallax-tilt";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/entities/cards";
import type { CardInstance, UnitInstance, VisualEvent } from "@backend/game/types";
import { useHover } from "../../../contexts/HoverContext";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { CardBack } from "./card-back";
import { StatPip } from "../stat-pip";

export interface GameCardProps {
  card?: CardInstance;
  unit?: UnitInstance;
  variant?: "default" | "hand";
  compact?: boolean;
  board?: boolean;
  showDescription?: boolean;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onPreviewChange?: (previewing: boolean) => void;
  visualEvents?: VisualEvent[];
  staticRender?: boolean;
}

/**
 * Production card contract with the v2 frame, artwork, stat-pip, and champion
 * treatments. Game state interactions remain intentionally owned by this component.
 */
export const GameCard: React.FC<GameCardProps> = ({
  card,
  unit,
  variant = "default",
  compact = false,
  board = false,
  showDescription = true,
  selected = false,
  className: cardClassName,
  onClick,
  onDoubleClick,
  onPreviewChange,
  visualEvents,
  staticRender = false
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
    onFocus: () => {
      setHoveredCard(card, unit);
      onPreviewChange?.(true);
    },
    onBlur: () => {
      setHoveredCard(undefined, undefined);
      onPreviewChange?.(false);
    }
  };

  if (cardId === "hidden-card") {
    return <CardBack className={cardClassName} variant={variant} onClick={onClick} {...hoverProps} />;
  }

  const definition = getCardDefinition(cardId);
  const isSpell = definition.type === "spell";
  const isChampion = definition.type === "champion";
  const attack = unit ? getUnitAttack(unit) : definition.attack;
  const health = unit ? getUnitHealth(unit) : definition.health;
  const maxHealth = unit ? getUnitMaxHealth(unit) : definition.health;
  const isTriggerActivated = visualEvents?.some((event) => event.type === "TRIGGER_ACTIVATED");
  const floatingEvents = visualEvents?.filter(
    (event) => event.type !== "TRIGGER_ACTIVATED" && event.type !== "DRAW"
  );

  const className = [
    "card-view",
    "game-card-v2",
    "game-card-v2--framed",
    "is-clickable",
    compact ? "game-card-v2--compact" : "",
    board ? "card-view--board" : "",
    variant === "hand" ? "card-view--hand" : "",
    !showDescription ? "game-card-v2--art-full" : "",
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
      <span className="game-card-v2__frame-overlay" aria-hidden="true" />
      <span className="game-card-v2__header">
        <StatPip
          kind={isSpell ? "spell" : isChampion ? "champion" : "mana"}
          value={definition.cost}
          size="sm"
          className={`game-card-v2__stat-pip game-card-v2__stat-pip--mana ${isSpell ? "game-card-v2__stat-pip--spell" : isChampion ? "game-card-v2__stat-pip--champion" : ""}`}
        />
        <span className="game-card-v2__name">{definition.name}</span>
      </span>

      <span className="game-card-v2__art-stage" aria-hidden="true">
        <span className="game-card-v2__art" style={cardArtworkStyle(definition.imageUrl)} />
        <span className="game-card-v2__art-overlay" />
        {isChampion ? <span className="game-card-v2__champion-flicker" /> : null}
      </span>

      <span className="game-card-v2__footer">
        {!isSpell ? (
          <span className="game-card-v2__stats">
            <StatPip
              kind="attack"
              value={attack ?? "-"}
              size="sm"
              className="game-card-v2__stat-pip game-card-v2__stat-pip--attack"
            />
            <StatPip
              kind="hp"
              value={health ?? "-"}
              size="sm"
              className="game-card-v2__stat-pip game-card-v2__stat-pip--health"
            />
          </span>
        ) : null}
      </span>

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

  const tiltProps = {
    glareEnable: isChampion || isSpell,
    glareMaxOpacity: isSpell ? 0.35 : 0.45,
    glareColor: isSpell ? "#c084fc" : "#ffffff",
    glarePosition: "all" as const,
    tiltMaxAngleX: isChampion ? 15 : isSpell ? 6 : 4,
    tiltMaxAngleY: isChampion ? 15 : isSpell ? 6 : 4,
    scale: isChampion ? 1.03 : 1.01,
    transitionSpeed: 1000,
    className: `game-card-tilt-wrapper ${isChampion ? "game-card-tilt-wrapper--champion" : ""} ${isSpell ? "game-card-tilt-wrapper--spell" : ""}`,
  };

  if (staticRender) {
    return (
      <div className="game-card-stable-wrapper game-card-stable-wrapper--static">
        <div className="game-card-tilt-wrapper">
          <div className={className} data-card-ui>
            {content}
          </div>
        </div>
      </div>
    );
  }

  if (!onClick && !onDoubleClick) {
    return (
      <div className="game-card-stable-wrapper" {...hoverProps}>
        <Tilt {...tiltProps}>
          <div
            className={className}
            data-card-ui
            role="button"
            tabIndex={0}
            onClick={handleClick}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleClick();
              }
            }}
          >
            {content}
          </div>
        </Tilt>
      </div>
    );
  }

  return (
    <div className="game-card-stable-wrapper" {...hoverProps}>
      <Tilt {...tiltProps}>
        <button
          className={className}
          type="button"
          data-card-ui
          onClick={handleClick}
          onDoubleClick={onDoubleClick}
        >
          {content}
        </button>
      </Tilt>
    </div>
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
