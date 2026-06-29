"use client";

import { CardInstance } from "../game/types";
import { CardView } from "./CardView";

interface HandViewProps {
  cards: CardInstance[];
  selectedCardId?: string;
  canPlay: (card: CardInstance) => boolean;
  onPlayCard: (card: CardInstance) => void;
}

export function HandView({ cards, selectedCardId, canPlay, onPlayCard }: HandViewProps) {
  return (
    <section className="lane" aria-label="Hand">
      <div className="lane-label">Hand</div>
      <div className="card-grid">
        {cards.length === 0 ? (
          <div className="empty-slot">No cards</div>
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
