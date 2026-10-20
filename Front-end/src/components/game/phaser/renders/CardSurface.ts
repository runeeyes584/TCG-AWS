import type Phaser from "phaser";
import type { Bounds, Point, Quad } from "../config/arenaProjection";
import { perimeterPath } from "../config/declareMotion";
import { densityOf } from "../config/arenaScale";
import { growQuad } from "../config/pickedRing";
import { acquireCanvasTexture } from "./canvasTexture";
import { drawIntoQuad } from "./cardFace";

/** What is laid over the card's face: the brand of a declared card, and the light of the pointer. */
export interface CardLook {
  /** The edge that stays lit round a card that has been declared: its colour as 0xRRGGBB and strength 0..1. */
  edge?: { color: number; alpha: number };
  /** The light that runs round the edge of a card that has just been declared: the stretch of the outline that is lit (shares 0..2). */
  sweep?: { color: number; from: number; to: number };
  /** How strongly the pointer lights the edge, 0..1. */
  hover?: number;
  /** A card the player has picked: a ring of soft violet light a little way out from the card, like a tile of a picking dialog under the pointer. */
  ring?: boolean;
}

/** How far out from the card the ring of a picked card stands, in logical px. */
const RING_MARGIN = 5;

const rgba = (hex: number, alpha: number) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${alpha})`;

/**
 * The canvas texture of one board card: a dark slab one thickness below the face, a soft contact
 * shadow, the face laid into the lane's quad, and over it the brand and the hover light. The brand is
 * painted into the texture itself, so it can never fall behind or in front of the wrong thing.
 */
export class CardSurface {
  constructor(
    private readonly scene: Phaser.Scene,
    readonly key: string,
    readonly bounds: Bounds,
  ) {}

  /** The size the texture is shown at: its logical size, whatever its density. */
  get displaySize() {
    return { width: Math.max(1, Math.round(this.bounds.width)), height: Math.max(1, Math.round(this.bounds.height)) };
  }

  /** Paints `face` into `quad` (screen coordinates) with the given `look`. */
  paint(face: HTMLCanvasElement, quad: Quad, look: CardLook = {}) {
    const { texture, ctx, density } = acquireCanvasTexture(this.scene, this.key, this.bounds.width, this.bounds.height, densityOf(this.scene.scale));
    const local = quad.map((p) => ({ x: p.x - this.bounds.x, y: p.y - this.bounds.y })) as Quad;
    ctx.imageSmoothingQuality = "high";

    const thickness = Math.max(2, (local[1].x - local[0].x) * 0.03);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 8 * density;
    ctx.shadowOffsetY = 3 * density;
    ctx.fillStyle = "#020306";
    ctx.beginPath();
    local.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y + thickness) : ctx.lineTo(p.x, p.y + thickness)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    drawIntoQuad(ctx, face, face.width, face.height, local, density);

    if (look.edge) this.strokeOutline(ctx, local, look.edge.color, look.edge.alpha, 1.6, 6 * density);
    if (look.hover && look.hover > 0.01) this.strokeOutline(ctx, local, 0xc4b5fd, 0.85 * look.hover, 1.4, 10 * look.hover * density);
    if (look.ring) this.strokeRing(ctx, local, density);
    if (look.sweep) this.strokeSweep(ctx, local, look.sweep, density);
    texture.refresh();
  }

  /** A margin of faint violet round the card with a bright line along its edge. */
  private strokeRing(ctx: CanvasRenderingContext2D, quad: Quad, density: number) {
    const ring = growQuad(quad, RING_MARGIN);
    ctx.save();
    ctx.beginPath();
    ring.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = "rgba(124, 92, 220, 0.14)";
    ctx.fill();
    ctx.restore();
    this.strokeOutline(ctx, ring, 0xc4b5fd, 0.95, 1.6, 12 * density);
  }

  private strokeOutline(ctx: CanvasRenderingContext2D, quad: Point[], color: number, alpha: number, width: number, blur: number) {
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineWidth = width;
    ctx.strokeStyle = rgba(color, alpha);
    ctx.shadowColor = rgba(color, Math.min(1, alpha + 0.2));
    ctx.shadowBlur = blur;
    ctx.beginPath();
    quad.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  /** The bright stretch that runs round the outline: a thick glow under a thin white-hot line. */
  private strokeSweep(ctx: CanvasRenderingContext2D, quad: Quad, sweep: { color: number; from: number; to: number }, density: number) {
    const path = perimeterPath(quad, sweep.from, sweep.to);
    if (path.length < 2) return;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = rgba(sweep.color, 1);
    ctx.shadowBlur = 14 * density;
    [
      { w: 5, c: rgba(sweep.color, 0.9) },
      { w: 1.6, c: "rgba(255,255,255,0.95)" }
    ].forEach(({ w, c }) => {
      ctx.lineWidth = w;
      ctx.strokeStyle = c;
      ctx.beginPath();
      path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    });
    ctx.restore();
  }
}
