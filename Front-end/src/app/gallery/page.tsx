"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { ArrowLeft, Crown, Gem, Search, Sparkles, Swords } from "lucide-react";
import type { CardDefinition, CardInstance, CardType } from "@backend/game/types";
import { listCards } from "@backend/game/entities/cardRegistry";
import { GameCard } from "../../components/game/cards/game-card";
import { HoverProvider } from "../../contexts/HoverContext";
import { GalleryPhaserBackdrop } from "../../components/gallery/GalleryPhaserBackdrop";

type GalleryCard = CardDefinition & {
  rarity?: "common" | "rare" | "epic" | "legendary" | "champion" | string;
  collectible?: boolean;
};

type TypeFilter = CardType;
type RarityFilter = NonNullable<GalleryCard["rarity"]> | "all";

const typeOptions: Array<{ value: TypeFilter; label: string; icon: typeof Swords }> = [
  { value: "spell", label: "Spell", icon: Sparkles },
  { value: "unit", label: "Unit", icon: Swords },
  { value: "champion", label: "Champion", icon: Crown },
];

const rarityOrder = ["champion", "legendary", "epic", "rare", "common"];

export default function CardGalleryPage() {
  const cards = useMemo(
    () =>
      (listCards() as GalleryCard[])
        .filter((card) => card.collectible !== false)
        .sort((a, b) => {
          const archetype = (a.archetype ?? "").localeCompare(b.archetype ?? "");
          if (archetype !== 0) return archetype;
          return a.cost - b.cost || a.name.localeCompare(b.name);
        }),
    []
  );
  const archetypes = useMemo(
    () => Array.from(new Set(cards.map((card) => card.archetype ?? "Unaligned"))),
    [cards]
  );
  const rarities = useMemo(
    () =>
      Array.from(new Set(cards.map((card) => card.rarity ?? card.type)))
        .sort((a, b) => rarityRank(a) - rarityRank(b)),
    [cards]
  );

  const [selectedArchetype, setSelectedArchetype] = useState("all");
  const [selectedType, setSelectedType] = useState<TypeFilter>("unit");
  const [selectedRarity, setSelectedRarity] = useState<RarityFilter>("all");
  const [query, setQuery] = useState("");
  const [previewCardId, setPreviewCardId] = useState<string>();

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return cards.filter((card) => {
      const archetype = card.archetype ?? "Unaligned";
      const rarity = card.rarity ?? card.type;

      return (
        (selectedArchetype === "all" || archetype === selectedArchetype) &&
        card.type === selectedType &&
        (selectedRarity === "all" || rarity === selectedRarity) &&
        (!normalizedQuery ||
          card.name.toLowerCase().includes(normalizedQuery) ||
          card.id.toLowerCase().includes(normalizedQuery) ||
          card.description?.toLowerCase().includes(normalizedQuery) ||
          archetype.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [cards, query, selectedArchetype, selectedRarity, selectedType]);

  const counts = {
    all: cards.length,
    unit: cards.filter((card) => card.type === "unit").length,
    spell: cards.filter((card) => card.type === "spell").length,
    champion: cards.filter((card) => card.type === "champion").length,
  };
  const previewCard =
    cards.find((card) => card.id === previewCardId) ??
    filteredCards.find((card) => card.type === selectedType) ??
    filteredCards[0] ??
    cards[0];
  const previewInstance = useMemo(
    () => toInstance(previewCard, "gallery-preview"),
    [previewCard]
  );
  const handlePreview = useCallback((cardId: string) => {
    setPreviewCardId(cardId);
  }, []);

  return (
    <HoverProvider>
      <main className="gallery-shell gallery-shell--catalog">
        <GalleryPhaserBackdrop />
        <div className="gallery-grid-bg" aria-hidden="true" />
        <div className="gallery-vignette" aria-hidden="true" />

        <header className="gallery-catalog-header">
          <button className="gallery-back" onClick={() => window.location.assign("/")} aria-label="Return to lobby">
            <ArrowLeft size={18} /> Lobby
          </button>
          <div className="gallery-catalog-title">
            <strong>Card Gallery</strong>
            <small>Kaleidoscope Archive</small>
          </div>

          <div className="gallery-header-actions">
            <button
              className="gallery-create-deck"
              onClick={() => window.location.assign("/create-your-card")}
            >
              Create Your Card
            </button>
          </div>
        </header>

        <section className="gallery-console" aria-label="Card collection">
          <div className="gallery-catalog-tabs" aria-label="Card type filter">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                className={selectedType === value ? "is-active" : ""}
                type="button"
                onClick={() => setSelectedType(value)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{label}</span>
                <small>{counts[value]}</small>
              </button>
            ))}
          </div>

          <div className="gallery-toolbar">
            <label className="gallery-search">
              <Search size={16} aria-hidden="true" />
              <input
                value={query}
                placeholder="Search card, effect, archetype"
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>

            <div className="gallery-index-total">
              <Gem size={16} aria-hidden="true" />
              <strong>{cards.length}</strong>
              <span>Cards indexed</span>
            </div>

            <label className="gallery-inline-filter">
              <span>Archetype</span>
              <select value={selectedArchetype} onChange={(event) => setSelectedArchetype(event.target.value)}>
                <option value="all">All archetypes</option>
                {archetypes.map((archetype) => (
                  <option key={archetype} value={archetype}>{archetype}</option>
                ))}
              </select>
            </label>

            <label className="gallery-inline-filter">
              <span>Rarity</span>
              <select value={selectedRarity} onChange={(event) => setSelectedRarity(event.target.value)}>
                <option value="all">All rarities</option>
                {rarities.map((rarity) => (
                  <option key={rarity} value={rarity}>{formatLabel(rarity)}</option>
                ))}
              </select>
            </label>

            <div className="gallery-result-count">
              <strong>{filteredCards.length}</strong>
              <span>visible</span>
            </div>
          </div>

          <aside className="gallery-preview-panel" aria-label="Card preview">
            {previewCard ? (
              <>
                <div className="gallery-preview-card">
                  <GameCard card={previewInstance} showDescription />
                </div>
                <div className="gallery-preview-copy">
                  <small>{previewCard.archetype ?? "Unaligned"} / {previewCard.rarity ?? previewCard.type}</small>
                  <strong>{previewCard.name}</strong>
                  <p>{previewCard.description ?? "No archive text recorded."}</p>
                  <div className="gallery-preview-stats">
                    <span><b>{previewCard.cost}</b><small>Cost</small></span>
                    {previewCard.type !== "spell" ? (
                      <>
                        <span><b>{previewCard.attack ?? "-"}</b><small>Attack</small></span>
                        <span><b>{previewCard.health ?? "-"}</b><small>Health</small></span>
                      </>
                    ) : (
                      <span><b>{previewCard.spellSpeed ?? "slow"}</b><small>Speed</small></span>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </aside>

          <div className="gallery-card-grid">
            {filteredCards.map((card) => (
              <GalleryCardTile key={card.id} card={card} onPreview={handlePreview} />
            ))}
          </div>
        </section>
      </main>
    </HoverProvider>
  );
}

const GalleryCardTile = memo(function GalleryCardTile({
  card,
  onPreview,
}: {
  card: GalleryCard;
  onPreview: (cardId: string) => void;
}) {
  const instance = useMemo(() => toInstance(card, `gallery-${card.id}`), [card]);
  const preview = useCallback(() => onPreview(card.id), [card.id, onPreview]);

  return (
    <article
      className={`gallery-card-frame gallery-card-frame--${card.type}`}
      onMouseEnter={preview}
      onFocus={preview}
      tabIndex={0}
    >
      <span className={`gallery-card-type-badge gallery-card-type-badge--${card.type}`}>
        {card.type === "spell" ? "SP" : card.type === "champion" ? "CH" : "UN"}
      </span>
      <GameCard card={instance} showDescription={false} staticRender />
      <span className="gallery-card-meta">
        <strong>{card.name}</strong>
        <small>{card.archetype ?? "Unaligned"} / {card.rarity ?? card.type}</small>
      </span>
    </article>
  );
});

function toInstance(card: GalleryCard | undefined, instanceId: string): CardInstance | undefined {
  if (!card) return undefined;
  return {
    instanceId,
    cardId: card.id,
    ownerId: "P1",
  };
}

function rarityRank(rarity: string) {
  const index = rarityOrder.indexOf(rarity);
  return index === -1 ? rarityOrder.length : index;
}

function formatLabel(value: string) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
