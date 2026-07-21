"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers3 } from "lucide-react";
import { listCards } from "@backend/game/entities/cardRegistry";
import {
  DEFAULT_DECK_ID,
  getSelectedDeckId,
  loadLocalDecks,
  setSelectedDeckId,
  type LocalDeck,
} from "../../libs/localDecks";

interface DeckSelectionPanelProps {
  className?: string;
  disabled?: boolean;
  onDeckChange?: (deck: LocalDeck) => void;
}

export function DeckSelectionPanel({
  className = "",
  disabled = false,
  onDeckChange,
}: DeckSelectionPanelProps) {
  const [decks, setDecks] = useState<LocalDeck[]>([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_DECK_ID);
  const artworkById = useMemo(
    () => new Map(listCards().map((card) => [card.id, card.imageUrl])),
    []
  );

  useEffect(() => {
    const localDecks = loadLocalDecks();
    const storedId = getSelectedDeckId();
    const selected =
      localDecks.find((deck) => deck.deckId === storedId) ?? localDecks[0];
    setDecks(localDecks);
    setSelectedId(selected.deckId);
    onDeckChange?.(selected);
  }, [onDeckChange]);

  const selectedDeck = decks.find((deck) => deck.deckId === selectedId) ?? decks[0];

  function chooseDeck(deckId: string) {
    const deck = decks.find((candidate) => candidate.deckId === deckId);
    if (!deck) return;
    setSelectedId(deckId);
    setSelectedDeckId(deckId);
    onDeckChange?.(deck);
  }

  return (
    <section className={`deck-selection-panel ${className}`} aria-label="Battle deck selection">
      <div className="deck-selection-panel__art" aria-hidden="true">
        {selectedDeck?.cardIds.slice(0, 3).map((cardId, index) => {
          const imageUrl = artworkById.get(cardId);
          return imageUrl ? (
            <img src={imageUrl} alt="" key={`${cardId}-${index}`} />
          ) : (
            <span key={`${cardId}-${index}`} />
          );
        })}
      </div>
      <label>
        <small>Battle deck</small>
        <select
          value={selectedDeck?.deckId ?? DEFAULT_DECK_ID}
          disabled={disabled}
          onChange={(event) => chooseDeck(event.target.value)}
        >
          {decks.map((deck) => (
            <option value={deck.deckId} key={deck.deckId}>
              {deck.deckName}{deck.isDefault ? " (Default)" : ""}
            </option>
          ))}
        </select>
      </label>
      <span className="deck-selection-panel__count">
        <b>{selectedDeck?.cardIds.length ?? 30}</b>
        <small>Cards</small>
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => window.location.assign("/deck-builder")}
        aria-label="Open Deck Builder"
        title="Open Deck Builder"
      >
        <Layers3 size={18} />
      </button>
    </section>
  );
}
