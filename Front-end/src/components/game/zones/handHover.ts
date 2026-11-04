/**
 * Which card of the hand the pointer is on, by its id, after card `id` reports that it has been entered
 * (`previewing`) or left. Only the card that holds the hover can end it: a card that is left late, or whose
 * focused part (the Details seal) is removed after the pointer has gone on to another card, must not
 * lower the card that is now under the pointer.
 */
export function nextHovered(current: string | undefined, id: string, previewing: boolean): string | undefined {
  if (previewing) return id;
  return current === id ? undefined : current;
}

/**
 * The hover that still holds once the hand has changed. A card that has left the hand (played, discarded)
 * never reports that it was left, so its hover ends with it; the card that slides into its place does not
 * inherit it.
 */
export function heldHover(current: string | undefined, cards: readonly { instanceId: string }[]): string | undefined {
  return current !== undefined && cards.some((card) => card.instanceId === current) ? current : undefined;
}
