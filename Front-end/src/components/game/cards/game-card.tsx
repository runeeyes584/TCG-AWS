import React from "react";
import Tilt from "react-parallax-tilt";
import { getUnitAttack, getUnitHealth, getUnitMaxHealth } from "@backend/game/entities/cards";
import type { CardInstance, UnitInstance, VisualEvent } from "@backend/game/types";
import { useHover } from "../../../contexts/HoverContext";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { CardBack } from "./card-back";
import { statTrends, type Trend } from "./cardStats";
import { SpeedGlyph } from "./speed-glyph";
import { SPEED_STYLE, speedOf } from "./spellSpeed";
import { TintedText } from "./tinted-text";
import { GiBroadsword, GiHeartShield, GiLightningStorm } from "react-icons/gi";
import styles from "./GameCard.module.css";

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
  /** Drawn inside the card's hover area (it stays raised while the pointer is on it). */
  overlay?: React.ReactNode;
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
  staticRender = false,
  overlay
}) => {
  const { selectCard, setHoveredCard } = useHover();
  // A card taken away while the pointer is on it (a target chosen in the pending-choice panel) never gets its
  // mouseleave, so the hover has to end with it, or its label is left standing over a card that is gone.
  const hovering = React.useRef(false);
  const clearHover = React.useRef(setHoveredCard);
  clearHover.current = setHoveredCard;
  React.useEffect(
    () => () => {
      if (hovering.current) clearHover.current(undefined, undefined);
    },
    []
  );
  const cardId = unit?.cardId ?? card?.cardId;
  // A card in the hand is already raised and shown whole: it has no whisper, and clicking it plays it.
  const inHand = variant === "hand";

  if (!cardId) {
    return null;
  }

  const hoverProps = {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      if (cardId !== "hidden-card" && !inHand) {
        hovering.current = true;
        setHoveredCard(card, unit, anchorOf(event.currentTarget));
      }
      onPreviewChange?.(true);
    },
    onMouseLeave: () => {
      hovering.current = false;
      if (!inHand) setHoveredCard(undefined, undefined);
      onPreviewChange?.(false);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      if (!inHand) {
        hovering.current = true;
        setHoveredCard(card, unit, anchorOf(event.currentTarget));
      }
      onPreviewChange?.(true);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      // Focus moving to something inside the card's own area (its Details button) is not leaving it.
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return;
      hovering.current = false;
      if (!inHand) setHoveredCard(undefined, undefined);
      onPreviewChange?.(false);
    }
  };

  // A right click only reads the card: its full text opens in the codex.
  const inspectProps = {
    onContextMenu: (event: React.MouseEvent<HTMLElement>) => {
      event.preventDefault();
      selectCard(card, unit);
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

  const kind = isSpell ? "spell" : isChampion ? "champion" : "unit";
  const trends = statTrends(definition, unit);
  const speed = speedOf(definition);
  // Long names step down so the full name fits on one line (the canvas face measures instead).
  const nameLength = definition.name.length;
  const nameSize = nameLength <= 8 ? 13.3 : nameLength <= 12 ? 11.4 : nameLength <= 16 ? 9.4 : nameLength <= 20 ? 8 : 7;
  const typeLine = [isChampion ? "Champion" : isSpell ? "Spell" : "Unit", definition.archetype].filter(Boolean).join(" · ");
  const extraClasses = cardClassName ?? "";

  // State classes (is-selected, is-attacking, …) stay on the element so other
  // screens can still target them; the look comes from GameCard.module.css.
  const className = [
    styles.card,
    styles[kind],
    !showDescription ? styles.artFull : "",
    selected ? styles.selected : "",
    extraClasses.includes("hand-card--playable") ? styles.playable : "",
    compact ? "game-card--compact" : "",
    board ? "game-card--board" : "",
    variant === "hand" ? "game-card--hand" : "",
    definition.spellSpeed ? `card-speed--${definition.spellSpeed}` : "",
    definition.level ? `card-level--${definition.level}` : "",
    selected ? "is-selected" : "",
    unit?.attacking ? "is-attacking" : "",
    unit?.blockingUnitId ? "is-blocking" : "",
    isTriggerActivated ? "is-trigger-activated" : "",
    extraClasses
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className={styles.art} style={cardArtworkStyle(definition.imageUrl)} aria-hidden="true" />
      {isChampion ? <span className={styles.championFlicker} aria-hidden="true" /> : null}
      <span className={styles.frame} aria-hidden="true" />

      <span className={`${styles.badge} ${styles.cost}`} title="Mana cost">
        <GiLightningStorm className={styles.badgeIcon} aria-hidden="true" />
        <span className={styles.badgeValue}>{definition.cost}</span>
      </span>

      {speed ? (
        <span
          className={`${styles.badge} ${styles.speed}`}
          style={{ "--ring": SPEED_STYLE[speed].color } as React.CSSProperties}
          title={`${SPEED_STYLE[speed].label}: ${SPEED_STYLE[speed].hint}`}
          data-speed={speed}
        >
          <SpeedGlyph speed={speed} className={styles.speedGlyph} />
        </span>
      ) : null}

      <span className={styles.text}>
        <span className={styles.name} style={{ fontSize: `${nameSize}cqw` }}>{definition.name}</span>
        {showDescription ? (
          <>
            <span className={styles.type}>{typeLine}</span>
            <span className={styles.rule} aria-hidden="true" />
            {definition.description ? (
              <span className={styles.desc}>
                <TintedText text={definition.description} />
              </span>
            ) : null}
          </>
        ) : null}
      </span>

      {!isSpell ? (
        <>
          <span className={`${styles.badge} ${styles.attack}`} title="Attack">
            <GiBroadsword className={styles.badgeIcon} aria-hidden="true" />
            <span className={styles.badgeValue}>{attack ?? "-"}</span>
            <TrendMark trend={trends.attack} stat="Attack" now={attack} printed={definition.attack} />
          </span>
          <span className={`${styles.badge} ${styles.health}`} title={maxHealth !== undefined ? `Health ${health}/${maxHealth}` : "Health"}>
            <GiHeartShield className={styles.badgeIcon} aria-hidden="true" />
            <span className={styles.badgeValue}>{health ?? "-"}</span>
            <TrendMark trend={trends.health} stat="Health" now={health} printed={definition.health} />
          </span>
        </>
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
    // A click that does something (choosing a target, playing the card) is not also a request to read it: that is
    // the right click, or the Details button for a card of the hand.
    if (!inHand && !onClick) selectCard(card, unit);
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
      <div className="game-card-stable-wrapper" {...hoverProps} {...inspectProps}>
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
        {overlay}
      </div>
    );
  }

  return (
    <div className="game-card-stable-wrapper" {...hoverProps} {...inspectProps}>
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
      {overlay}
    </div>
  );
};

/** A small arrow beside a stat that stands above (green) or below (red) the number printed on the card. */
function TrendMark({
  trend,
  stat,
  now,
  printed,
  className
}: {
  trend?: Trend;
  stat: string;
  now?: number;
  printed?: number;
  className?: string;
}) {
  if (!trend) return null;
  return (
    <span
      className={`${styles.trend} ${className ?? ""}`}
      data-trend={trend}
      role="img"
      aria-label={`${stat} ${now}, printed ${printed}`}
      title={`${stat} ${now} (printed ${printed})`}
    />
  );
}

/** Reads the element's box when asked, so a card that is still moving is followed. */
function anchorOf(element: HTMLElement) {
  return () => {
    const { left, top, width, height } = element.getBoundingClientRect();
    return { x: left, y: top, width, height };
  };
}

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
    case "BUFF": {
      const parts: string[] = [];
      if (event.attackDelta !== 0) parts.push(`${event.attackDelta > 0 ? '+' : ''}${event.attackDelta} ATK`);
      if (event.healthDelta !== 0) parts.push(`${event.healthDelta > 0 ? '+' : ''}${event.healthDelta} HP`);
      return parts.length > 0 ? parts.join(" ") : "+BUFF";
    }
    case "DEBUFF": {
      const parts: string[] = [];
      if (event.attackDelta !== 0) parts.push(`${event.attackDelta > 0 ? '+' : ''}${event.attackDelta} ATK`);
      if (event.healthDelta !== 0) parts.push(`${event.healthDelta > 0 ? '+' : ''}${event.healthDelta} HP`);
      return parts.length > 0 ? parts.join(" ") : "-DEBUFF";
    }
    default:
      return "";
  }
}
