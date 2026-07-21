"use client";

import { useMemo, useState } from "react";
import type { GalleryCard } from "./types";
import {
    MAX_CHAMPION,
    MAX_COPY,
    MAX_DECK_SIZE
} from "./types";

export function useDeckBuilder() {

    const [deckName, setDeckName] =
        useState("New Deck");

    const [selectedCards, setSelectedCards] =
        useState<GalleryCard[]>([]);

    function cardCount(cardId: string) {

        return selectedCards.filter(
            card => card.id === cardId
        ).length;

    }

    function championCount() {

        return selectedCards.filter(
            c => c.type === "champion"
        ).length;

    }

    function addCard(card: GalleryCard) {

        if (selectedCards.length >= MAX_DECK_SIZE)
            return;

        if (
            card.type === "champion" &&
            championCount() >= MAX_CHAMPION
        )
            return;

        if (
            cardCount(card.id) >= MAX_COPY
        )
            return;

        setSelectedCards(prev => [
            ...prev,
            card
        ]);

    }

    function removeCard(index: number) {

        setSelectedCards(prev =>
            prev.filter((_, i) => i !== index)
        );

    }

    function clearDeck() {

        setSelectedCards([]);

    }

    const stats = useMemo(() => ({

        champion: selectedCards.filter(
            c => c.type === "champion"
        ).length,

        unit: selectedCards.filter(
            c => c.type === "unit"
        ).length,

        spell: selectedCards.filter(
            c => c.type === "spell"
        ).length,

    }), [selectedCards]);

    const progress =

        selectedCards.length /
        MAX_DECK_SIZE *
        100;

    const completed =
        selectedCards.length === MAX_DECK_SIZE;

    return {

        deckName,
        setDeckName,

        selectedCards,

        addCard,
        removeCard,
        clearDeck,

        stats,

        progress,

        completed

    };

}