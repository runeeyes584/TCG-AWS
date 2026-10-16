import * as Phaser from "phaser";
import { ARENA_COLUMNS, type ArenaProjection, type ArenaRowKey, type Point, type Quad } from "../config/arenaProjection";
import { ARENA_COLORS as C, rgba } from "../config/arenaTheme";
import { riftPolyline } from "../config/riftLine";
import { densityOf } from "../config/arenaScale";
import { acquireCanvasTexture } from "./canvasTexture";

const TEXTURE_KEY = "arena-table-texture";
const ROWS: ArenaRowKey[] = ["meWaiting", "meActive", "oppActive", "oppWaiting"];
/** Lanes are sunk into the slab: only 20% of their light reaches the surface. */
const LANE_OPACITY = 0.2;

function tracePath(ctx: CanvasRenderingContext2D, points: Point[], close = true) {
  ctx.beginPath();
  points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  if (close) ctx.closePath();
}

const shift = (p: Point, dy: number): Point => ({ x: p.x, y: p.y + dy });

/**
 * Paints the static table: obsidian slab with thickness, ritual circle, the rift
 * and all 24 lanes (sunk into the slab). Redrawn only when the projection changes.
 */
export class ArenaTableRenderer {
  private image?: Phaser.GameObjects.Image;
  private signature = "";

  constructor(private readonly scene: Phaser.Scene) {}

  render(proj: ArenaProjection, signature: string) {
    if (signature === this.signature && this.image?.active) return;
    this.signature = signature;

    const { texture, ctx, recreated, density, width, height } = acquireCanvasTexture(
      this.scene,
      TEXTURE_KEY,
      proj.width,
      proj.height,
      densityOf(this.scene.scale)
    );
    this.drawTable(ctx, proj, density);
    this.drawRift(ctx, proj, density);
    this.drawLanes(ctx, proj);
    texture.refresh();

    if (!this.image || !this.image.active) {
      this.image = this.scene.add.image(0, 0, TEXTURE_KEY).setOrigin(0, 0).setDepth(0.5);
    } else if (recreated) {
      this.image.setTexture(TEXTURE_KEY);
    }
    // The texture is denser than the table is large: it is shown at the table's own size.
    this.image.setDisplaySize(width, height);
  }

  private drawTable(ctx: CanvasRenderingContext2D, proj: ArenaProjection, density: number) {
    const [nl, nr, fr, fl] = proj.tableQuad;
    const th = proj.tableThickness;

    // Front face (the slab's thickness).
    const front = ctx.createLinearGradient(0, nl.y, 0, nl.y + th);
    front.addColorStop(0, "#0A0612");
    front.addColorStop(1, "#030208");
    tracePath(ctx, [nl, nr, shift(nr, th), shift(nl, th)]);
    ctx.fillStyle = front;
    ctx.fill();
    ctx.strokeStyle = rgba(C.violetDeep, 0.9);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Top surface with a soft violet halo around the table.
    const top = ctx.createLinearGradient(0, fr.y, 0, nl.y);
    top.addColorStop(0, "#1A0F30");
    top.addColorStop(0.55, "#0F0820");
    top.addColorStop(1, "#07040E");
    ctx.save();
    ctx.shadowColor = rgba(C.violetBright, 0.35);
    ctx.shadowBlur = 70 * proj.unit * density;
    tracePath(ctx, [nl, nr, fr, fl]);
    ctx.fillStyle = top;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = rgba(C.violetMid, 0.55);
    ctx.lineWidth = 1.5;
    tracePath(ctx, [nl, nr, fr, fl]);
    ctx.stroke();

    // Ritual circle engraved in the middle of the table.
    const centre = proj.project(0.5, 0);
    const rx = proj.widthAt(0.5) * 0.46;
    ctx.save();
    ctx.setLineDash([3, 9]);
    ctx.strokeStyle = rgba(C.violetMid, 0.3);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, rx, rx * 0.08, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(C.violetBright, 0.2);
    ctx.beginPath();
    ctx.ellipse(centre.x, centre.y, rx * 0.62, rx * 0.05, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawRift(ctx: CanvasRenderingContext2D, proj: ArenaProjection, density: number) {
    const { near, far } = proj.riftBand;
    const upper = proj.project(far, 0).y;
    const lower = proj.project(near, 0).y;
    const band = ctx.createLinearGradient(0, upper, 0, lower);
    band.addColorStop(0, rgba(C.violetBright, 0));
    band.addColorStop(0.5, rgba(C.violetBright, 0.14));
    band.addColorStop(1, rgba(C.violetBright, 0));
    tracePath(ctx, [proj.project(near, -1), proj.project(near, 1), proj.project(far, 1), proj.project(far, -1)]);
    ctx.fillStyle = band;
    ctx.fill();

    // A quiet violet seam: the table's middle, no longer the loudest thing on it. The glow that says
    // whose turn it is follows this same line (`riftPolyline`) and is drawn by TurnBannerFx.
    const line = riftPolyline(proj);
    const stroke = (points: Point[], style: string, width: number, blur = 0, glow = "") => {
      ctx.save();
      if (blur) {
        ctx.shadowColor = glow;
        ctx.shadowBlur = blur * density;
      }
      ctx.strokeStyle = style;
      ctx.lineWidth = width;
      ctx.lineJoin = "miter";
      tracePath(ctx, points, false);
      ctx.stroke();
      ctx.restore();
    };
    stroke(line, rgba(C.violetBright, 0.3), 5 * proj.unit + 2, 10, rgba(C.violetBright, 0.55));
    stroke(line, rgba(C.violetGlow, 0.7), 1.2);
  }

  /**
   * Lanes are recessed, not raised: a dark pocket with a shadow under its far lip and a
   * thin highlight on its near lip, all at LANE_OPACITY. A card lying in a lane covers
   * it completely, so the lane only reads where it is empty.
   */
  private drawLanes(ctx: CanvasRenderingContext2D, proj: ArenaProjection) {
    ctx.save();
    ctx.globalAlpha = LANE_OPACITY;
    ROWS.forEach((row) => {
      const isOpp = row === "oppActive" || row === "oppWaiting";
      for (let column = 0; column < ARENA_COLUMNS; column += 1) {
        const slot = proj.slot(row, column);
        const [a, b, c, d] = slot.quad as Quad;

        // Pocket floor.
        const floor = ctx.createLinearGradient(0, c.y, 0, a.y);
        floor.addColorStop(0, "rgba(2,1,6,1)");
        floor.addColorStop(1, "rgba(14,8,32,1)");
        tracePath(ctx, [a, b, c, d]);
        ctx.fillStyle = floor;
        ctx.fill();

        // Shadow cast by the far lip.
        const lip = Math.max(4, slot.depth * 0.18);
        const shade = ctx.createLinearGradient(0, d.y, 0, d.y + lip);
        shade.addColorStop(0, "rgba(0,0,0,0.9)");
        shade.addColorStop(1, "rgba(0,0,0,0)");
        tracePath(ctx, [d, c, { x: c.x, y: c.y + lip }, { x: d.x, y: d.y + lip }]);
        ctx.fillStyle = shade;
        ctx.fill();

        // Rim, brighter on the near lip where light catches it.
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = isOpp ? rgba(C.bloodBright, 0.8) : rgba(C.violetGlow, 0.8);
        tracePath(ctx, [a, b, c, d]);
        ctx.stroke();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = isOpp ? rgba(C.bloodBright, 1) : rgba(C.violetGlow, 1);
        tracePath(ctx, [a, b], false);
        ctx.stroke();

        // Rune.
        const rw = slot.width * 0.075;
        const rh = rw * 0.55;
        ctx.lineWidth = 1;
        ctx.strokeStyle = isOpp ? rgba(C.bloodBright, 0.9) : rgba(C.violetGlow, 0.9);
        tracePath(ctx, [
          { x: slot.center.x, y: slot.center.y - rh },
          { x: slot.center.x + rw, y: slot.center.y },
          { x: slot.center.x, y: slot.center.y + rh },
          { x: slot.center.x - rw, y: slot.center.y },
        ]);
        ctx.stroke();
      }
    });
    ctx.restore();
  }

  destroy() {
    this.image?.destroy();
    this.image = undefined;
    if (this.scene.textures.exists(TEXTURE_KEY)) this.scene.textures.remove(TEXTURE_KEY);
  }
}
