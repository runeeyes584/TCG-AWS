"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { HandCard } from "../cards/hand-card";
import { CardBack } from "../cards/card-back";
import type { CardInstance } from "@backend/game/types";

const CARD_SPACING = 108;
const ARC_LIFT = 10;
const ARC_ROTATE = 4;

export interface HandProps {
  cards: CardInstance[];
  side: "player" | "opponent";
  hidden?: boolean;
  selectedCardId?: string;
  canPlay?: (card: CardInstance) => boolean;
  onPlayCard?: (card: CardInstance) => void;
  onUnavailableCardClick?: () => void;
  onPreviewCard?: (card?: CardInstance) => void;
}

function fanTransform(index: number, total: number) {
  const offset = index - (total - 1) / 2;
  return {
    x: offset * CARD_SPACING,
    y: Math.abs(offset) * ARC_LIFT,
    rotate: offset * ARC_ROTATE
  };
}

/** Animated hand fan while preserving the game's play, preview, and hidden-card contract. */
export function Hand({
  cards,
  side,
  hidden = false,
  selectedCardId,
  canPlay = () => false,
  onPlayCard,
  onUnavailableCardClick,
  onPreviewCard
}: HandProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number>();

  const handlePreview = (card: CardInstance, index: number, previewing: boolean) => {
    setHoveredIndex(previewing ? index : undefined);
    onPreviewCard?.(previewing ? card : undefined);
  };

  return (
    <section className={`lane hand-dock hand-dock--${side}`} aria-label={`${side} hand`}>
      <div className="lane-label">Hand</div>
      <div
        className={`card-grid hand-grid hand-grid--motion hand-grid--${side} ${
          hidden ? "hand-grid--hidden" : ""
        }`}
      >
        {cards.length === 0 ? (
          <div className="empty-slot">No cards</div>
        ) : (
          <AnimatePresence initial={false}>
            {cards.map((card, index) => {
              const base = fanTransform(index, cards.length);
              const isHovered = hoveredIndex === index;
              const isSelected = card.instanceId === selectedCardId;
              const neighbourPush =
                hoveredIndex === undefined || isHovered ? 0 : index < hoveredIndex ? -46 : 46;
              const baseY = side === "player" ? 62 + base.y : -62 - base.y;
              const liftedY = side === "player" ? 34 : -4;
              const playable = !hidden && canPlay(card);

              return (
                <motion.div
                  className={`hand-motion-card ${playable ? "is-playable" : ""}`}
                  key={card.instanceId}
                  layout
                  initial={{ opacity: 0, scale: 0.82, y: baseY + 18 }}
                  animate={{
                    opacity: hidden ? 0.88 : isHovered || isSelected ? 1 : 0.94,
                    x: base.x + neighbourPush,
                    y: isHovered || isSelected ? liftedY : baseY,
                    rotate: isHovered || isSelected ? 0 : base.rotate,
                    scale: isHovered || isSelected ? 1.08 : 0.96,
                    zIndex: isHovered || isSelected ? 80 : index
                  }}
                  exit={{ opacity: 0, scale: 0.82, y: baseY + (side === "player" ? 24 : -24) }}
                  transition={{ type: "spring", stiffness: 330, damping: 28 }}
                >
                  {hidden ? (
                    <CardBack
                      className="hand-card--motion"
                      variant="hand"
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
                      onClick={() => {
                        if (canPlay(card)) {
                          onPlayCard?.(card);
                        } else {
                          onUnavailableCardClick?.();
                        }
                      }}
                      onPreviewChange={(previewing) => handlePreview(card, index, previewing)}
                    />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
