"use client";

import type { GalleryCard } from "./types";
import type { CardInstance } from "../../../../Back-end/src/game/types";
import { useMemo } from "react";
import { GameCard } from "../../components/game/cards/game-card";

interface Props {
    card?: GalleryCard;
}

export default function CardPreview({
    card
}: Props) {

    const instance = useMemo<CardInstance | undefined>(() => {
        if (!card) return undefined;

        return {
            instanceId: "preview",
            cardId: card.id,
            ownerId: "P1"
        };
    }, [card]);

    if (!instance || !card) {
        return (
            <div className="card-preview-empty">
                Hover a card to preview
            </div>
        );
    }

    return (
        <aside className="card-preview">
            <GameCard
                card={instance}
                showDescription
            />

            <div className="preview-info">
                <h2>
                    {card.name}
                </h2>

                <p>
                    {card.description}
                </p>

                <div className="preview-stats">
                    <span>
                        Cost:
                        <b>{card.cost}</b>
                    </span>

                    {card.type !== "spell" && (
                        <>
                            <span>
                                ATK:
                                <b>{card.attack ?? "-"}</b>
                            </span>

                            <span>
                                HP:
                                <b>{card.health ?? "-"}</b>
                            </span>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}