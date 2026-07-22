"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Crown,
  FilePlus2,
  Layers3,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  Swords,
  Trash2,
} from "lucide-react";
import type { CardDefinition, CardType } from "@backend/game/types";
import { listCards } from "@backend/game/entities/cardRegistry";
import {
  getSelectedDeckId,
  loadLocalDecks,
  saveLocalDeck,
  setSelectedDeckId
} from "../../libs/localDecks";
import { saveDeck } from "../../libs/api";
import { GalleryPhaserBackdrop } from "../../components/gallery/GalleryPhaserBackdrop";

type DeckCard = CardDefinition & {
  rarity?: string;
  collectible?: boolean;
};

type TypeFilter = CardType | "all";
type SortMode = "cost" | "name" | "archetype";
type SaveState = "idle" | "saving" | "saved" | "local" | "error";

const MAX_DECK_SIZE = 30;
const MAX_CHAMPIONS = 6;
const STORAGE_KEY = "kaleidoscope.deck-builder.draft";

const typeFilters: Array<{ value: TypeFilter; label: string; icon: typeof Swords }> = [
  { value: "all", label: "All", icon: Layers3 },
  { value: "unit", label: "Units", icon: Swords },
  { value: "spell", label: "Spells", icon: Sparkles },
  { value: "champion", label: "Champions", icon: Crown },
];

export default function DeckBuilderPage() {
  const cards = useMemo(
    () =>
      (listCards() as DeckCard[]).filter(
        (card) => card.collectible !== false && card.level !== 2
      ),
    []
  );
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const archetypes = useMemo(
    () =>
      Array.from(new Set(cards.map((card) => card.archetype || "Unaligned"))).sort(
        (a, b) => a.localeCompare(b)
      ),
    [cards]
  );

  const [deckId, setDeckId] = useState("deck-local-1");
  const [deckName, setDeckName] = useState("New Kaleidoscope Deck");
  const [deckCardIds, setDeckCardIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [archetypeFilter, setArchetypeFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("cost");
  const [previewCardId, setPreviewCardId] = useState(cards[0]?.id ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [notice, setNotice] = useState("Select a card to add it to the deck.");

  useEffect(() => {
    try {
      const selectedDeck = loadLocalDecks().find(
        (deck) => !deck.isDefault && deck.deckId === getSelectedDeckId()
      );
      const savedDraft = window.localStorage.getItem(STORAGE_KEY);
      const draft = selectedDeck || (savedDraft ? JSON.parse(savedDraft) as {
        deckId?: string;
        deckName?: string;
        cardIds?: string[];
      } : undefined);
      if (!draft) {
        setDeckId(createDeckId());
        return;
      }
      const copyCounts = new Map<string, number>();
      const validCardIds = Array.isArray(draft.cardIds)
        ? draft.cardIds
            .filter((cardId) => {
              if (!cardById.has(cardId)) return false;
              const nextCount = (copyCounts.get(cardId) ?? 0) + 1;
              if (nextCount > 3) return false;
              copyCounts.set(cardId, nextCount);
              return true;
            })
            .slice(0, MAX_DECK_SIZE)
        : [];
      setDeckId(draft.deckId || "deck-local-1");
      setDeckName(draft.deckName || "New Kaleidoscope Deck");
      setDeckCardIds(validCardIds);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [cardById]);

  const deckCards = useMemo(
    () => deckCardIds.flatMap((cardId) => (cardById.get(cardId) ? [cardById.get(cardId)!] : [])),
    [cardById, deckCardIds]
  );
  const deckCardCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const cardId of deckCardIds) {
      counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    }
    return counts;
  }, [deckCardIds]);
  const championCount = deckCards.filter((card) => card.type === "champion").length;
  const deckCounts = useMemo(
    () => ({
      unit: deckCards.filter((card) => card.type === "unit").length,
      spell: deckCards.filter((card) => card.type === "spell").length,
      champion: championCount,
    }),
    [championCount, deckCards]
  );

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return cards
      .filter((card) => {
        const archetype = card.archetype || "Unaligned";
        return (
          (typeFilter === "all" || card.type === typeFilter) &&
          (archetypeFilter === "all" || archetype === archetypeFilter) &&
          (!normalizedQuery ||
            card.name.toLowerCase().includes(normalizedQuery) ||
            card.description?.toLowerCase().includes(normalizedQuery) ||
            archetype.toLowerCase().includes(normalizedQuery))
        );
      })
      .sort((a, b) => {
        if (sortMode === "name") return a.name.localeCompare(b.name);
        if (sortMode === "archetype") {
          return (a.archetype || "Unaligned").localeCompare(b.archetype || "Unaligned") ||
            a.cost - b.cost;
        }
        return a.cost - b.cost || a.name.localeCompare(b.name);
      });
  }, [archetypeFilter, cards, query, sortMode, typeFilter]);

  const previewCard = cardById.get(previewCardId) ?? filteredCards[0] ?? cards[0];
  const previewCopies = previewCard ? deckCardCounts.get(previewCard.id) ?? 0 : 0;

  function addCard(card: DeckCard) {
    setPreviewCardId(card.id);
    const currentCopies = deckCardCounts.get(card.id) ?? 0;
    if (currentCopies >= 3) {
      setNotice(`${card.name} has reached the three-copy limit.`);
      return;
    }
    if (deckCardIds.length >= MAX_DECK_SIZE) {
      setNotice(`Main Deck is full at ${MAX_DECK_SIZE} cards.`);
      return;
    }
    if (card.type === "champion" && championCount >= MAX_CHAMPIONS) {
      setNotice(`A deck can contain at most ${MAX_CHAMPIONS} Champions.`);
      return;
    }
    setDeckCardIds((current) => [...current, card.id]);
    setSaveState("idle");
    setNotice(`${card.name} added.`);
  }

  function removeCard(cardId: string) {
    const card = cardById.get(cardId);
    setDeckCardIds((current) => {
      const index = current.lastIndexOf(cardId);
      return index === -1
        ? current
        : [...current.slice(0, index), ...current.slice(index + 1)];
    });
    setSaveState("idle");
    setNotice(card ? `${card.name} removed.` : "Card removed.");
  }

  function clearDeck() {
    setDeckCardIds([]);
    setSaveState("idle");
    setNotice("Deck cleared.");
  }

  function createNewDeck() {
    setDeckId(createDeckId());
    setDeckName("New Kaleidoscope Deck");
    setDeckCardIds([]);
    setSaveState("idle");
    setNotice("New deck created. Add up to 30 cards.");
  }

  async function handleSave() {
    if (deckCardIds.length !== MAX_DECK_SIZE) {
      setSaveState("error");
      setNotice(`Add ${MAX_DECK_SIZE - deckCardIds.length} more card(s) before saving.`);
      return;
    }

    const payload = {
      deckId,
      deckName: deckName.trim() || `Deck ${deckId}`,
      cardIds: deckCardIds,
    };
    setSaveState("saving");
    setNotice("Saving deck...");

    try {
      saveLocalDeck(payload);
      const signedIn = Boolean(window.localStorage.getItem("accessToken"));
      if (!signedIn) {
        setSelectedDeckId(deckId);
        setSaveState("local");
        setNotice("Deck saved on this device and selected for matchmaking.");
        return;
      }

      try {
        await saveDeck(payload);
        setSelectedDeckId(deckId);
        setSaveState("saved");
        setNotice("Deck saved locally, synced to your account, and selected for matchmaking.");
      } catch (cloudError) {
        setSaveState("local");
        setNotice(
          cloudError instanceof Error
            ? `Saved locally but not selected for online play. Cloud sync failed: ${cloudError.message}`
            : "Saved locally but not selected for online play. Cloud sync failed."
        );
      }
    } catch (error) {
      setSaveState("error");
      setNotice(
        error instanceof Error
          ? `Could not save the deck: ${error.message}`
          : "Could not save the deck."
      );
    }
  }

  return (
    <main className="deck-builder-shell">
      <GalleryPhaserBackdrop />
      <div className="deck-builder-grid-bg" aria-hidden="true" />
      <header className="deck-builder-header">
        <button className="deck-builder-back" type="button" onClick={() => window.location.assign("/")}>
          <ArrowLeft size={18} /> Lobby
        </button>
        <div className="deck-builder-title">
          <strong>Deck Builder</strong>
          <small>Kaleidoscope Arsenal</small>
        </div>
        <div className="deck-builder-format">
          <span>Standard</span>
          <strong>{deckCardIds.length}/{MAX_DECK_SIZE}</strong>
        </div>
      </header>

      <section className="deck-builder-workspace">
        <aside className="deck-inspector" aria-label="Selected card details">
          {previewCard ? (
            <>
              <div className={`deck-inspector-art deck-inspector-art--${previewCard.type}`}>
                {previewCard.imageUrl ? (
                  <img src={previewCard.imageUrl} alt={`${previewCard.name} artwork`} draggable={false} />
                ) : (
                  <span>No artwork</span>
                )}
                <b>{previewCard.cost}</b>
              </div>
              <div className="deck-inspector-copy">
                <small>{previewCard.archetype || "Unaligned"} / {previewCard.rarity || previewCard.type}</small>
                <h1>{previewCard.name}</h1>
                <p>{previewCard.description || "No card text recorded."}</p>
              </div>
              <div className="deck-inspector-stats">
                <span><b>{previewCard.cost}</b><small>Mana</small></span>
                {previewCard.type === "spell" ? (
                  <span><b>{previewCard.spellSpeed || "slow"}</b><small>Speed</small></span>
                ) : (
                  <>
                    <span><b>{previewCard.attack ?? "-"}</b><small>Attack</small></span>
                    <span><b>{previewCard.health ?? "-"}</b><small>Health</small></span>
                  </>
                )}
              </div>
              <button
                className="deck-inspector-action"
                type="button"
                onClick={() => addCard(previewCard)}
                disabled={
                  previewCopies >= 3 ||
                  deckCardIds.length >= MAX_DECK_SIZE ||
                  (previewCard.type === "champion" && championCount >= MAX_CHAMPIONS)
                }
              >
                <Layers3 size={17} />
                {previewCopies >= 3 ? "Copy limit reached" : `Add copy (${previewCopies}/3)`}
              </button>
            </>
          ) : null}
        </aside>

        <section className="deck-main" aria-label="Current deck">
          <div className="deck-main-heading">
            <div className="deck-name-field">
              <Layers3 size={18} aria-hidden="true" />
              <input
                value={deckName}
                maxLength={42}
                aria-label="Deck name"
                onChange={(event) => {
                  setDeckName(event.target.value);
                  setSaveState("idle");
                }}
              />
            </div>
            <button className="deck-clear-button" type="button" onClick={clearDeck} disabled={deckCardIds.length === 0} title="Clear deck">
              <Trash2 size={17} />
            </button>
            <button className="deck-clear-button" type="button" onClick={createNewDeck} title="Create another deck">
              <FilePlus2 size={17} />
            </button>
          </div>

          <div className="deck-main-meta">
            <strong>Main Deck</strong>
            <span>{deckCardIds.length} / {MAX_DECK_SIZE}</span>
            <div className="deck-type-tally">
              <span><Swords size={12} /> {deckCounts.unit}</span>
              <span><Sparkles size={12} /> {deckCounts.spell}</span>
              <span><Crown size={12} /> {deckCounts.champion}/{MAX_CHAMPIONS}</span>
            </div>
          </div>

          <div className="deck-slot-grid">
            {Array.from({ length: MAX_DECK_SIZE }, (_, index) => {
              const card = deckCards[index];
              return card ? (
                <DeckTile
                  card={card}
                  key={`${card.id}-${index}`}
                  selected={previewCard?.id === card.id}
                  onPreview={setPreviewCardId}
                  onActivate={() => removeCard(card.id)}
                  mode="deck"
                />
              ) : (
                <span className="deck-empty-slot" key={`empty-${index}`} aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
              );
            })}
          </div>

          <div className="deck-save-bar">
            <div className={`deck-save-status is-${saveState}`} aria-live="polite">
              {saveState === "saved" || saveState === "local" ? <Check size={15} /> : <span />}
              <p>{notice}</p>
            </div>
            <button className="deck-save-button" type="button" onClick={handleSave} disabled={saveState === "saving"}>
              <Save size={18} />
              {saveState === "saving" ? "Saving" : "Save Deck"}
            </button>
          </div>
        </section>

        <aside className="deck-library" aria-label="Card library">
          <div className="deck-library-heading">
            <Layers3 size={18} />
            <strong>Card List</strong>
            <span>{filteredCards.length}</span>
          </div>

          <label className="deck-library-search">
            <Search size={17} />
            <input value={query} placeholder="Search by card name" onChange={(event) => setQuery(event.target.value)} />
          </label>

          <div className="deck-library-filters">
            <label>
              <SlidersHorizontal size={15} />
              <select value={archetypeFilter} onChange={(event) => setArchetypeFilter(event.target.value)} aria-label="Filter archetype">
                <option value="all">All archetypes</option>
                {archetypes.map((archetype) => <option key={archetype} value={archetype}>{archetype}</option>)}
              </select>
            </label>
            <label>
              <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label="Sort cards">
                <option value="cost">Sort: Mana</option>
                <option value="name">Sort: Name</option>
                <option value="archetype">Sort: Archetype</option>
              </select>
            </label>
          </div>

          <div className="deck-library-tabs" aria-label="Filter by card type">
            {typeFilters.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" className={typeFilter === value ? "is-active" : ""} onClick={() => setTypeFilter(value)} title={label}>
                <Icon size={16} /> <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="deck-library-grid">
            {filteredCards.map((card) => (
              <DeckTile
                card={card}
                key={card.id}
                selected={previewCard?.id === card.id}
                copies={deckCardCounts.get(card.id) ?? 0}
                onPreview={setPreviewCardId}
                onActivate={() => addCard(card)}
                mode="library"
              />
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function createDeckId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `deck-${crypto.randomUUID()}`;
  }
  return `deck-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function DeckTile({
  card,
  selected,
  copies = 0,
  onPreview,
  onActivate,
  mode,
}: {
  card: DeckCard;
  selected: boolean;
  copies?: number;
  onPreview: (cardId: string) => void;
  onActivate: () => void;
  mode: "deck" | "library";
}) {
  return (
    <button
      className={`deck-card-tile deck-card-tile--${mode} deck-card-tile--${card.type} ${selected ? "is-selected" : ""} ${copies > 0 ? "is-included" : ""}`}
      type="button"
      onMouseEnter={() => onPreview(card.id)}
      onFocus={() => onPreview(card.id)}
      onClick={onActivate}
      title={`${mode === "deck" ? "Remove" : "Add"} ${card.name}`}
    >
      <span className="deck-card-tile__head">
        <b>{card.cost}</b>
        <strong>{card.name}</strong>
      </span>
      <span className="deck-card-tile__art">
        {card.imageUrl ? <img src={card.imageUrl} alt="" draggable={false} loading="lazy" /> : null}
      </span>
      <span className="deck-card-tile__foot">
        <small>{card.type === "champion" ? "CH" : card.type === "spell" ? "SP" : "UN"}</small>
        {card.type !== "spell" ? <b>{card.attack}/{card.health}</b> : <b>{card.spellSpeed || "slow"}</b>}
      </span>
      {copies > 0 ? <span className="deck-card-tile__check">x{copies}</span> : null}
    </button>
  );
}
