"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HandCard } from "../cards/hand-card";
import { CardBack } from "../cards/card-back";
import type { CardInstance } from "@backend/game/types";
import { useHover } from "../../../contexts/HoverContext";
import { fanTransform, raisedHitBox, raisedY, restHitBox, RAISE_SCALE } from "./handLayout";
import { nextHovered } from "./handHover";
import { BLOCK_TEXT, type PlayBlock } from "./playBlock";
import styles from "./Hand.module.css";

/** How long the line over a card that could not be played stays up. */
const DENIED_MS = 1400;

export interface HandProps {
  cards: CardInstance[];
  side: "player" | "opponent";
  hidden?: boolean;
  /** Opponent hand only: cards react to the pointer (raise and preview). Off by default, on for the trial. */
  opponentHover?: boolean;
  selectedCardId?: string;
  canPlay?: (card: CardInstance) => boolean;
  /** Why a card that cannot be played is blocked (for the line shown when it is clicked). */
  blockReason?: (card: CardInstance) => PlayBlock | undefined;
  onPlayCard?: (card: CardInstance) => void;
  onPreviewCard?: (card?: CardInstance) => void;
}

/** Card width per side, matched to the viewport like a CSS clamp(). */
function handCardWidth(side: HandProps["side"], viewportWidth: number) {
  return side === "player"
    ? Math.min(124, Math.max(92, viewportWidth * 0.074))
    : Math.min(76, Math.max(54, viewportWidth * 0.044));
}

function useViewportWidth() {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1440 : window.innerWidth));
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

/** Compact fanned hand; preserves the play, preview and hidden-card contract. */
export function Hand({
  cards,
  side,
  hidden = false,
  opponentHover = false,
  selectedCardId,
  canPlay = () => false,
  blockReason,
  onPlayCard,
  onPreviewCard
}: HandProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number>();
  // What the cards last reported, so that a late leave or blur of another card is not mistaken for this one.
  const hoveredRef = useRef<number | undefined>(undefined);
  const [denied, setDenied] = useState<{ id: string; text: string; shake: 0 | 1 }>();
  const deniedTimer = useRef<number | undefined>(undefined);
  const { selectCard } = useHover();
  const viewportWidth = useViewportWidth();
  const cardWidth = handCardWidth(side, viewportWidth);
  const isPlayer = side === "player";
  const hoverEnabled = isPlayer || opponentHover;

  useEffect(() => () => window.clearTimeout(deniedTimer.current), []);

  const handlePreview = (card: CardInstance, index: number, previewing: boolean) => {
    if (!hoverEnabled) return;
    const next = nextHovered(hoveredRef.current, index, previewing);
    if (next === hoveredRef.current) return;
    hoveredRef.current = next;
    setHoveredIndex(next);
    onPreviewCard?.(next === undefined ? undefined : card);
  };

  // A card that cannot be played shakes, its mana turns red and a short line says why.
  const flashDenied = useCallback(
    (card: CardInstance) => {
      const text = BLOCK_TEXT[blockReason?.(card) ?? "other"];
      setDenied((current) => ({ id: card.instanceId, text, shake: current?.shake === 0 ? 1 : 0 }));
      window.clearTimeout(deniedTimer.current);
      deniedTimer.current = window.setTimeout(() => setDenied(undefined), DENIED_MS);
    },
    [blockReason]
  );

  // One click plays a card; reading it is the Details button.
  const activate = (card: CardInstance) => {
    if (canPlay(card)) {
      selectCard(undefined, undefined);
      onPlayCard?.(card);
      return;
    }
    flashDenied(card);
  };

  return (
    <section className={`lane hand-dock hand-dock--${side}`} aria-label={`${side} hand`}>
      <div
        className={`${styles.fan} ${isPlayer ? styles.player : styles.opponent}`}
        style={{ "--hand-card-w": `${cardWidth}px` } as CSSProperties}
      >
        {cards.length === 0 ? (
          <div className={styles.empty}>No cards</div>
        ) : (
          <>
            {/* The pointer is tested against fixed boxes, not against the cards, which are moving. */}
            {isPlayer && !hidden
              ? cards.map((card, index) => {
                  const isHovered = hoveredIndex === index;
                  const box = isHovered
                    ? raisedHitBox(index, cards.length, cardWidth)
                    : restHitBox(index, cards.length, cardWidth);
                  return (
                    <div
                      key={`hit-${card.instanceId}`}
                      className={`${styles.hit} ${canPlay(card) ? "" : styles.hitBlocked}`}
                      data-ui-shield=""
                      style={{
                        left: `calc(50% + ${box.left}px)`,
                        bottom: `${box.bottom}px`,
                        width: `${box.width}px`,
                        height: `${box.height}px`,
                        zIndex: isHovered ? -1 : -2
                      }}
                      onMouseEnter={() => handlePreview(card, index, true)}
                      onMouseLeave={(event) => {
                        // Going up to the Details seal of this card is still being on the card.
                        const to = event.relatedTarget;
                        if (to instanceof Element && to.closest(".hand-card__detail")) return;
                        handlePreview(card, index, false);
                      }}
                      onClick={() => activate(card)}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        selectCard(card);
                      }}
                    />
                  );
                })
              : null}
            <AnimatePresence initial={false}>
              {cards.map((card, index) => {
                const base = fanTransform(index, cards.length, cardWidth, side);
                const isHovered = hoveredIndex === index;
                const isSelected = card.instanceId === selectedCardId;
                const isRaised = isHovered || isSelected;
                const push = cardWidth * 0.42;
                const neighbourPush =
                  hoveredIndex === undefined || isHovered ? 0 : index < hoveredIndex ? -push : push;
                const playable = !hidden && canPlay(card);

                return (
                  <motion.div
                    className={`${styles.slot} hand-motion-card ${playable ? "is-playable" : ""} ${hoverEnabled ? "" : styles.inert}`}
                    key={card.instanceId}
                    layout
                    initial={{ opacity: 0, scale: 0.82, y: base.y + (isPlayer ? 30 : -30) }}
                    animate={{
                      opacity: 1,
                      x: base.x + neighbourPush,
                      y: isRaised ? raisedY(side, cardWidth) : base.y,
                      rotate: isRaised ? 0 : base.rotate,
                      scale: isRaised ? RAISE_SCALE[side] : 1,
                      zIndex: isRaised ? 80 : index
                    }}
                    exit={{ opacity: 0, scale: 0.82, y: base.y + (isPlayer ? 34 : -34) }}
                    transition={{ type: "spring", stiffness: 330, damping: 28 }}
                  >
                    {hidden ? (
                      <CardBack
                        className="hand-card--motion"
                        variant="hand"
                        square={!isPlayer}
                        onMouseEnter={() => handlePreview(card, index, true)}
                        onMouseLeave={() => handlePreview(card, index, false)}
                      />
                    ) : (
                      <HandCard
                        className="hand-card--motion"
                        card={card}
                        selected={isSelected}
                        hovered={isHovered}
                        playable={playable}
                        denied={denied?.id === card.instanceId ? denied : undefined}
                        onClick={() => activate(card)}
                        onPreviewChange={(previewing) => handlePreview(card, index, previewing)}
                      />
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </>
        )}
      </div>
    </section>
  );
}
