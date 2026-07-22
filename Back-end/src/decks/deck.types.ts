import { validateDeck, type DeckValidationError } from "../game/rules/deckRules";

export interface SaveDeckPayload {
  deckId: string;
  deckName: string;
  cardIds: string[];
}

export interface SavedDeck extends SaveDeckPayload {
  updatedAt: number;
}

export type SaveDeckValidation =
  | { valid: true; payload: SaveDeckPayload }
  | { valid: false; message: string; errors?: DeckValidationError[] };

export function validateSaveDeckPayload(value: unknown): SaveDeckValidation {
  if (!value || typeof value !== "object") {
    return { valid: false, message: "Deck payload is required." };
  }

  const body = value as Partial<SaveDeckPayload>;
  const deckId = typeof body.deckId === "string" ? body.deckId.trim() : "";
  const deckName = typeof body.deckName === "string" ? body.deckName.trim() : "";

  if (!deckId || deckId.length > 80 || !/^[a-zA-Z0-9_-]+$/.test(deckId)) {
    return { valid: false, message: "Deck ID is invalid." };
  }

  if (!deckName || deckName.length > 42) {
    return { valid: false, message: "Deck name must contain between 1 and 42 characters." };
  }

  if (!Array.isArray(body.cardIds) || !body.cardIds.every((cardId) => typeof cardId === "string")) {
    return { valid: false, message: "cardIds must be an array of card IDs." };
  }

  const validation = validateDeck(body.cardIds);
  if (!validation.valid) {
    return { valid: false, message: "Invalid deck.", errors: validation.errors };
  }

  return {
    valid: true,
    payload: { deckId, deckName, cardIds: [...body.cardIds] },
  };
}
