"use client";

import { CardInstance } from "@backend/game/types";
import { CardView } from "./CardView";

interface HandViewProps {
  cards: CardInstance[];
  selectedCardId?: string;
  canPlay: (card: CardInstance) => boolean;
  onPlayCard: (card: CardInstance) => void;
  hidden?: boolean;
  side?: "opponent" | "player";
}

export function HandView({
  cards,
  selectedCardId,
  canPlay,
  onPlayCard,
  hidden = false,
  side = "player"
}: HandViewProps) {
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
            <div
              aria-label={`Hidden card ${index + 1}`}
              className="hidden-card-back"
              key={card.instanceId}
            >
              <span>K</span>
            </div>
          ))
        ) : (
          cards.map((card) => (
            <CardView
              key={card.instanceId}
              card={card}
              selected={card.instanceId === selectedCardId}
              onClick={canPlay(card) ? () => onPlayCard(card) : undefined}
            />
          ))
        )}
      </div>
    </section>
  );
}
