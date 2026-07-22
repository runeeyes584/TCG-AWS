import { getDefaultDeckCardIds } from "@backend/game/entities/defaultDeck";
import { validateDeck } from "@backend/game/rules/deckRules";

export interface LocalDeck {
  deckId: string;
  deckName: string;
  cardIds: string[];
  updatedAt: number;
  isDefault?: boolean;
}

const SAVED_DECKS_KEY = "kaleidoscope.saved-decks";
const SELECTED_DECK_KEY = "kaleidoscope.selected-deck-id";
const LEGACY_DRAFT_KEY = "kaleidoscope.deck-builder.draft";
export const DEFAULT_DECK_ID = "kaleidoscope-starter";

export function getDefaultLocalDeck(): LocalDeck {
  return {
    deckId: DEFAULT_DECK_ID,
    deckName: "Kaleidoscope Starter",
    cardIds: getDefaultDeckCardIds(),
    updatedAt: 0,
    isDefault: true,
  };
}

export function loadLocalDecks(): LocalDeck[] {
  if (typeof window === "undefined") return [getDefaultLocalDeck()];

  const savedDecks = parseDeckArray(window.localStorage.getItem(SAVED_DECKS_KEY));
  const legacyDraft = parseDeck(window.localStorage.getItem(LEGACY_DRAFT_KEY));
  if (legacyDraft && !savedDecks.some((deck) => deck.deckId === legacyDraft.deckId)) {
    savedDecks.push(legacyDraft);
  }

  return [
    getDefaultLocalDeck(),
    ...savedDecks
      .filter(isValidLocalDeck)
      .sort((a, b) => b.updatedAt - a.updatedAt),
  ];
}

export function saveLocalDeck(deck: Omit<LocalDeck, "updatedAt" | "isDefault">): LocalDeck {
  const validation = validateDeck(deck.cardIds);
  if (!validation.valid) {
    throw new Error(validation.errors.map((error) => error.message).join(" "));
  }

  const savedDeck: LocalDeck = { ...deck, updatedAt: Date.now() };
  const decks = loadLocalDecks().filter(
    (candidate) => !candidate.isDefault && candidate.deckId !== deck.deckId
  );
  window.localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify([savedDeck, ...decks]));
  window.localStorage.setItem(LEGACY_DRAFT_KEY, JSON.stringify(savedDeck));
  return savedDeck;
}

export function mergeCloudDecks(cloudDecks: LocalDeck[]): LocalDeck[] {
  if (typeof window === "undefined") return [getDefaultLocalDeck()];
  const merged = new Map<string, LocalDeck>();
  for (const deck of loadLocalDecks()) {
    if (!deck.isDefault) merged.set(deck.deckId, deck);
  }
  for (const deck of cloudDecks) {
    if (isValidLocalDeck(deck)) merged.set(deck.deckId, { ...deck, isDefault: false });
  }
  const savedDecks = [...merged.values()].sort((left, right) => right.updatedAt - left.updatedAt);
  window.localStorage.setItem(SAVED_DECKS_KEY, JSON.stringify(savedDecks));
  return [getDefaultLocalDeck(), ...savedDecks];
}

export function getSelectedDeckId(): string {
  if (typeof window === "undefined") return DEFAULT_DECK_ID;
  return window.localStorage.getItem(SELECTED_DECK_KEY) || DEFAULT_DECK_ID;
}

export function setSelectedDeckId(deckId: string): void {
  window.localStorage.setItem(SELECTED_DECK_KEY, deckId);
}

function parseDeckArray(value: string | null): LocalDeck[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(isDeckShape) : [];
  } catch {
    return [];
  }
}

function parseDeck(value: string | null): LocalDeck | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value);
    return isDeckShape(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

function isDeckShape(value: unknown): value is LocalDeck {
  if (!value || typeof value !== "object") return false;
  const deck = value as Partial<LocalDeck>;
  return (
    typeof deck.deckId === "string" &&
    typeof deck.deckName === "string" &&
    Array.isArray(deck.cardIds) &&
    deck.cardIds.every((cardId) => typeof cardId === "string")
  );
}

function isValidLocalDeck(deck: LocalDeck): boolean {
  return validateDeck(deck.cardIds).valid;
}
