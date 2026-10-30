import type { PileKind } from "../../hud/piles/pileLook";

/** The share of the face, from the bottom, taken by the dark band that carries the icon, the label and the count. */
export const BAND_RATIO = 0.22;

type Picture = CanvasImageSource & { width: number; height: number };

export interface PileFaceSpec {
  kind: PileKind;
  width: number;
  height: number;
  /** The card back for a deck, the art of the card on top for a graveyard. None while it is still loading. */
  picture?: Picture;
  /** Nothing in the pile: a hollow, not a card. */
  empty: boolean;
}

/** Paints `picture` over the whole face, cropped to fill it, keeping the upper part of the art in view. */
function cover(ctx: CanvasRenderingContext2D, picture: Picture, width: number, height: number) {
  const scale = Math.max(width / picture.width, height / picture.height);
  const w = picture.width * scale;
  const h = picture.height * scale;
  ctx.drawImage(picture, (width - w) / 2, (height - h) * 0.25, w, h);
}

function band(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const bandHeight = Math.round(height * BAND_RATIO);
  const top = height - bandHeight;
  const fill = ctx.createLinearGradient(0, top, 0, height);
  fill.addColorStop(0, "rgba(8,5,15,0.78)");
  fill.addColorStop(1, "rgba(8,5,15,0.96)");
  ctx.fillStyle = fill;
  ctx.fillRect(0, top, width, bandHeight);
  ctx.fillStyle = "rgba(196,181,253,0.3)";
  ctx.fillRect(0, top, width, 1);
}

/**
 * The face of a pile, on a canvas of `width` x `height`. A plain rectangle with square corners, as every card of the
 * game is: a dark obsidian slab, the picture over it, and for a graveyard a violet cast and a veil that darken the card
 * into the dark of the crypt (it is only an indicator, so it may be darker than the cards in the dialog). The bottom
 * band is drawn here; its icon, label and count are texts the renderer puts on it.
 */
export function paintPileFace(ctx: CanvasRenderingContext2D, { kind, width, height, picture, empty }: PileFaceSpec) {
  if (empty) {
    ctx.fillStyle = "rgba(8,5,15,0.62)";
    ctx.fillRect(0, 0, width, height);
    band(ctx, width, height);
    return;
  }

  const slab = ctx.createLinearGradient(0, 0, 0, height);
  slab.addColorStop(0, "#241a3f");
  slab.addColorStop(1, "#08050f");
  ctx.fillStyle = slab;
  ctx.fillRect(0, 0, width, height);

  if (picture) cover(ctx, picture, width, height);

  if (kind === "graveyard") {
    ctx.globalCompositeOperation = "color";
    const cast = ctx.createLinearGradient(0, 0, width, height);
    cast.addColorStop(0, "rgba(139,92,246,0.62)");
    cast.addColorStop(1, "rgba(76,29,149,0.3)");
    ctx.fillStyle = cast;
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(8,5,15,0.34)";
    ctx.fillRect(0, 0, width, height);
  }

  const veil = ctx.createLinearGradient(0, height * 0.35, 0, height);
  veil.addColorStop(0, "rgba(8,5,15,0)");
  veil.addColorStop(1, "rgba(8,5,15,0.78)");
  ctx.fillStyle = veil;
  ctx.fillRect(0, 0, width, height);

  band(ctx, width, height);
}
