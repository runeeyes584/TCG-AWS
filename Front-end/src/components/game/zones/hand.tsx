// src/components/game/zones/hand.tsx
import React from "react";
import { HandCard } from "../cards/hand-card";
import { CardBack } from "../cards/card-back";
import type { CardInstance } from "@backend/game/types";

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

/**
 * Render a player's hand. For the opponent we render only CardBack components.
 */
export const Hand: React.FC<HandProps> = ({
  cards,
  side,
  hidden = false,
  selectedCardId,
  canPlay = () => false,
  onPlayCard,
  onUnavailableCardClick,
  onPreviewCard,
}) => {
  return (
    <section className={`lane hand-dock hand-dock--${side}`} aria-label="Hand">
      <div className="lane-label">Hand</div>
      <div
        className={`card-grid hand-grid hand-grid--${side} ${
          hidden ? "hand-grid--hidden" : ""
        }`}
      >
        {cards.length === 0 ? (
          <div className="empty-slot">No cards</div>
        ) : hidden ? (
          cards.map((card, index) => (
            <CardBack
              key={card.instanceId}
              variant="hand"
              onMouseEnter={() => onPreviewCard?.(card)}
              onMouseLeave={() => onPreviewCard?.(undefined)}
            />
          ))
        ) : (
          cards.map((card) => (
            <HandCard
              key={card.instanceId}
              card={card}
              selected={card.instanceId === selectedCardId}
              onClick={() => {
                if (canPlay(card)) {
                  onPlayCard?.(card);
                } else {
                  onUnavailableCardClick?.();
                }
              }}
              onPreviewChange={(previewing) =>
                onPreviewCard?.(previewing ? card : undefined)
              }
            />
          ))
        )}
      </div>
    </section>
  );
};
