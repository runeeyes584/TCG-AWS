/**
 * Phaser also hears a click that lands on a DOM element drawn over the canvas (it listens on the window, because
 * the canvas sits under transparent DOM containers), and looks for what is under the pointer. An element that
 * is a control of its own (a card of the hand, the details seal, the codex, a dialog) carries `data-ui-shield`:
 * a click on it, or inside it, is the DOM's alone.
 */
export const UI_SHIELD = "data-ui-shield";

interface Closable {
  closest?: (selector: string) => unknown;
}

/** Whether a click that landed on `target` belongs to a DOM control, not to the table beneath it. */
export function isShielded(target: unknown): boolean {
  const element = target as Closable | null | undefined;
  return Boolean(element && typeof element.closest === "function" && element.closest(`[${UI_SHIELD}]`));
}

interface PointerLike {
  downElement?: unknown;
  upElement?: unknown;
  event?: { target?: unknown } | null;
}

/** Whether the click this pointer made was on a DOM control (where it went down, where it came up, or the event itself). */
export function isShieldedPointer(pointer: PointerLike | undefined): boolean {
  if (!pointer) return false;
  return isShielded(pointer.downElement) || isShielded(pointer.upElement) || isShielded(pointer.event?.target);
}
