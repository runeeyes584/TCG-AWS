/** The most pixels per CSS pixel the arena canvas is painted with: sharp on a retina screen without a heavy fill cost. */
export const MAX_DPR = 1.5;

/** The pixel ratio the arena is painted at: the screen's own, never below 1 and never above `max`. */
export function arenaDpr(raw: number | undefined, max = MAX_DPR): number {
  const ratio = Number.isFinite(raw) && raw ? raw : 1;
  return Math.round(Math.min(Math.max(ratio, 1), max) * 100) / 100;
}

/** The size of the canvas in its own pixels for a box of `css` pixels. */
export function backingSize(css: number, dpr: number): number {
  return Math.max(1, Math.round(css * dpr));
}

interface ScaleLike {
  width: number;
  height: number;
  zoom: number;
}

/**
 * The canvas is `dpr` times larger than the box it fills and shown at `zoom = 1 / dpr`, so the arena is
 * still laid out in the box's own (CSS) pixels. This is that size: what the projection, the lanes and
 * every position on the table are measured in.
 */
export function logicalSize(scale: ScaleLike): { width: number; height: number } {
  return { width: scale.width * scale.zoom, height: scale.height * scale.zoom };
}

/** Canvas pixels per logical pixel. */
export function densityOf(scale: Pick<ScaleLike, "zoom">): number {
  return scale.zoom > 0 ? 1 / scale.zoom : 1;
}
