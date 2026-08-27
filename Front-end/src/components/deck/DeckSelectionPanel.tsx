"use client";

import { useEffect, useMemo, useState, memo } from "react";
import { motion } from "framer-motion";
import { Layers, ShieldCheck, Sparkles } from "lucide-react";
import { listCards } from "@backend/game/entities/cardRegistry";
import { listDecks } from "../../libs/api";
import {
  DEFAULT_DECK_ID,
  getDefaultLocalDeck,
  getSelectedDeckId,
  loadLocalDecks,
  mergeCloudDecks,
  setSelectedDeckId,
  type LocalDeck,
} from "../../libs/localDecks";

interface DeckSelectionPanelProps {
  className?: string;
  disabled?: boolean;
  onDeckChange?: (deck: LocalDeck) => void;
}

export const DeckSelectionPanel = memo(function DeckSelectionPanel({
  className = "",
  disabled = false,
  onDeckChange,
}: DeckSelectionPanelProps) {
  const [decks, setDecks] = useState<LocalDeck[]>([]);
  const [selectedId, setSelectedId] = useState(DEFAULT_DECK_ID);
  const [loadError, setLoadError] = useState<string>();

  const cardsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; imageUrl?: string; faction?: string }>();
    listCards().forEach((card) => {
      map.set(card.id, {
        id: card.id,
        name: card.name,
        imageUrl: card.imageUrl,
        faction: (card as any).faction,
      });
    });
    return map;
  }, []);

  useEffect(() => {
    let active = true;
    const applyDecks = (availableDecks: LocalDeck[]) => {
      if (!active) return;
      const storedId = getSelectedDeckId();
      const selected =
        availableDecks.find((deck) => deck.deckId === storedId) ?? availableDecks[0];
      setDecks(availableDecks);
      if (selected) {
        setSelectedId(selected.deckId);
        onDeckChange?.(selected);
      }
    };

    if (typeof window !== "undefined" && window.localStorage.getItem("accessToken")) {
      applyDecks([getDefaultLocalDeck()]);
      void listDecks()
        .then((result) => {
          applyDecks(mergeCloudDecks(result.decks));
          setLoadError(undefined);
        })
        .catch((error) =>
          setLoadError(
            error instanceof Error ? error.message : "Could not load account decks."
          )
        );
    } else {
      applyDecks(loadLocalDecks());
    }

    return () => {
      active = false;
    };
  }, [onDeckChange]);

  const selectedDeck =
    decks.find((deck) => deck.deckId === selectedId) ?? decks[0] ?? getDefaultLocalDeck();

  function chooseDeck(deckId: string) {
    const deck = decks.find((candidate) => candidate.deckId === deckId);
    if (!deck) return;
    setSelectedId(deckId);
    setSelectedDeckId(deckId);
    onDeckChange?.(deck);
  }

  const previewCardIds = selectedDeck?.cardIds.slice(0, 3) ?? [];

  return (
    <motion.section
      className={`combat-loadout-card ${disabled ? "is-disabled" : ""} ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 }}
      aria-label="Combat Loadout & Battle Deck Selection"
    >
      <div className="card-corner top-left" aria-hidden="true" />
      <div className="card-corner top-right" aria-hidden="true" />
      <div className="card-corner bottom-left" aria-hidden="true" />
      <div className="card-corner bottom-right" aria-hidden="true" />

      {/* Header */}
      <div className="loadout-card-header">
        <div className="loadout-tag">
          <ShieldCheck size={13} className="text-cyan" />
          <span>COMBAT LOADOUT</span>
        </div>
        <div className="loadout-status">
          <span className="status-live-dot" />
          <span>SYNCHRONIZED</span>
        </div>
      </div>

      <div className="loadout-card-body">
        {/* 3D Isometric Card Fan-out Showcase */}
        <div className="loadout-3d-showcase" aria-hidden="true">
          {previewCardIds.map((cardId, index) => {
            const cardInfo = cardsMap.get(cardId);
            return (
              <div
                className={`loadout-card-preview card-layer-${index}`}
                key={`${cardId}-${index}`}
                title={cardInfo?.name ?? cardId}
              >
                {cardInfo?.imageUrl ? (
                  <img
                    src={cardInfo.imageUrl}
                    alt={cardInfo.name}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="card-fallback">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className="card-glint" />
              </div>
            );
          })}
        </div>

        {/* Deck details & selector */}
        <div className="loadout-controls-col">
          <label className="loadout-select-group">
            <span className="loadout-label">Active battle deck</span>
            <div className="loadout-select-wrapper">
              <select
                value={selectedDeck?.deckId ?? DEFAULT_DECK_ID}
                disabled={disabled}
                onChange={(event) => chooseDeck(event.target.value)}
                aria-label="Select active battle deck"
              >
                {decks.map((deck) => (
                  <option value={deck.deckId} key={deck.deckId}>
                    {deck.deckName}
                    {deck.isDefault ? " [Default]" : ""}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <div className="loadout-meta-row">
            <div className="loadout-capacity-badge">
              <strong>{selectedDeck?.cardIds.length ?? 30}</strong>
              <small>Cards</small>
            </div>

            <button
              type="button"
              className="loadout-forge-btn"
              disabled={disabled}
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.location.assign("/deck-builder");
                }
              }}
              aria-label="Open Deck Builder"
              title="Open Deck Builder to edit cards"
            >
              <Layers size={15} />
              <span>Forge</span>
            </button>
          </div>
        </div>
      </div>

      {loadError ? (
        <div className="loadout-error-msg" role="alert">
          {loadError}
        </div>
      ) : null}
    </motion.section>
  );
});
