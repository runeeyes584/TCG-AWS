export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WhisperPlacement {
  x: number;
  y: number;
  /** Which side of the card the whisper stands on. */
  edge: "above" | "below";
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/**
 * Where the whisper (the small label of the card under the pointer) stands: just above the card's top
 * edge, centred on it, or just below its bottom edge when there is no room above (the top row of the
 * table); always inside the viewport. It never covers the card itself.
 */
export function placeWhisper(
  anchor: Box,
  viewport: { width: number; height: number },
  size: { width: number; height: number },
  gap = 10,
  margin = 12
): WhisperPlacement {
  const x = clamp(anchor.x + anchor.width / 2 - size.width / 2, margin, Math.max(margin, viewport.width - size.width - margin));
  const above = anchor.y - size.height - gap;
  if (above >= margin) return { x, y: above, edge: "above" };
  const below = anchor.y + anchor.height + gap;
  return { x, y: clamp(below, margin, Math.max(margin, viewport.height - size.height - margin)), edge: "below" };
}

/** Whether a card's box is really on the page: a card that has been removed reads as an empty box at the corner. */
export function isPlaced(rect: Box | undefined): rect is Box {
  return Boolean(rect && rect.width > 0 && rect.height > 0 && Number.isFinite(rect.x) && Number.isFinite(rect.y));
}

/**
 * The edge the codex drawer slides in from: the one opposite the card, so it never covers the card
 * being read. A card in the left half of the screen gets the drawer on the right, and the other way round.
 * A card in the hand always gets the right: the hand is in the middle of the screen, and the drawer
 * should not jump from side to side as the player goes from one card to the next.
 */
export function drawerSide(anchor: Box | undefined, viewportWidth: number, fromHand = false): "left" | "right" {
  if (fromHand || !anchor) return "right";
  return anchor.x + anchor.width / 2 < viewportWidth / 2 ? "right" : "left";
}

/** A Phaser display rect (canvas px) as a rect on the page (client px). */
export function toScreenRect(
  bounds: Box,
  canvas: Box,
  size: { width: number; height: number }
): Box {
  const sx = size.width > 0 ? canvas.width / size.width : 1;
  const sy = size.height > 0 ? canvas.height / size.height : 1;
  return {
    x: canvas.x + bounds.x * sx,
    y: canvas.y + bounds.y * sy,
    width: bounds.width * sx,
    height: bounds.height * sy
  };
}
