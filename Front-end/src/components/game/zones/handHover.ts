/**
 * Which card of the hand the pointer is on, after card `index` reports that it has been entered
 * (`previewing`) or left. Only the card that holds the hover can end it: a card that is left late, or whose
 * focused part (the Details seal) is removed after the pointer has gone on to another card, must not
 * lower the card that is now under the pointer.
 */
export function nextHovered(current: number | undefined, index: number, previewing: boolean): number | undefined {
  if (previewing) return index;
  return current === index ? undefined : current;
}
