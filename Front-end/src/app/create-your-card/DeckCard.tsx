"use client";

import { memo, useMemo } from "react";
import type { GalleryCard } from "./types";
import type { CardInstance } from "../../../../Back-end/src/game/types";
import { GameCard } from "../../components/game/cards/game-card";

interface Props {
    card: GalleryCard;
    quantity: number;
    onRemove: () => void;
}

function DeckCard({
    card,
    quantity,
    onRemove
}: Props) {

    const instance = useMemo<CardInstance>(() => ({
        instanceId: `deck-${card.id}`,
        cardId: card.id,
        ownerId: "P1"
    }), [card.id]);

    return (
        <article className="deck-selected-card">
            <GameCard
                card={instance}
                staticRender
            />

            <div className="deck-selected-info">
                <strong>{card.name}</strong>

                <span>
                    x{quantity}
                </span>

                <button
                    onClick={onRemove}
                >
                    Remove
                </button>
            </div>
        </article>
    );
}

export default memo(DeckCard);