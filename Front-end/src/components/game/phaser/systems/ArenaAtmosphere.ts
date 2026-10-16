import * as Phaser from "phaser";
import type { ArenaProjection } from "../config/arenaProjection";
import { ARENA_COLORS as C, ARENA_HEX, rgba, seededRandom } from "../config/arenaTheme";
import { acquireCanvasTexture } from "../renders/canvasTexture";

const BACKDROP_KEY = "arena-atmosphere-backdrop";
const MOTE_COUNT = 70;

interface Mote {
  view: Phaser.GameObjects.Arc;
  baseX: number;
  baseY: number;
  drift: number;
  phase: number;
  baseAlpha: number;
  depth: number;
}

/**
 * Void, violet haze, drifting motes and a few out-of-focus foreground shards.
 * Replaces the busy constellation background with a quiet, dark stage so the
 * table and units carry the light.
 */
export class ArenaAtmosphere {
  private backdrop?: Phaser.GameObjects.Image;
  private motes: Mote[] = [];
  private foreground?: Phaser.GameObjects.Graphics;
  private foregroundShards: Array<{ x: number; y: number; size: number; tint: number }> = [];
  private elapsed = 0;
  private pointerX = 0;
  private pointerY = 0;
  private smoothX = 0;
  private smoothY = 0;
  private width = 0;
  private height = 0;
  private signature = "";

  constructor(private readonly scene: Phaser.Scene) {
    this.scene.input.on("pointermove", this.handlePointerMove, this);
  }

  render(proj: ArenaProjection, signature: string) {
    if (signature === this.signature && this.backdrop?.active) return;
    this.signature = signature;
    this.width = proj.width;
    this.height = proj.height;
    this.drawBackdrop(proj);
    this.buildMotes();
    this.buildForeground(proj);
  }

  private drawBackdrop(proj: ArenaProjection) {
    const { texture, ctx, recreated } = acquireCanvasTexture(this.scene, BACKDROP_KEY, proj.width, proj.height);
    ctx.fillStyle = C.void;
    ctx.fillRect(0, 0, proj.width, proj.height);

    const glow = (x: number, y: number, rx: number, ry: number, color: string, alpha: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, rgba(color, alpha));
      g.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const centre = proj.project(0.5, 0);
    glow(centre.x, centre.y, proj.width * 0.55, proj.height * 0.36, C.violetDeep, 0.6);
    glow(centre.x, centre.y + proj.height * 0.04, proj.width * 0.32, proj.height * 0.22, C.violetMid, 0.16);
    glow(proj.nexus.opponent.x, proj.nexus.opponent.y, 260 * proj.nexus.scale * 1.6, 200 * proj.nexus.scale * 1.6, C.bloodMid, 0.22);
    glow(proj.nexus.me.x, proj.nexus.me.y, 260 * proj.nexus.scale * 1.6, 200 * proj.nexus.scale * 1.6, C.violetBright, 0.22);
    glow(proj.cx, proj.yNear + 60 * proj.unit, proj.width * 0.3, proj.height * 0.1, C.violetMid, 0.3);

    texture.refresh();
    if (!this.backdrop || !this.backdrop.active) {
      this.backdrop = this.scene.add.image(0, 0, BACKDROP_KEY).setOrigin(0, 0).setDepth(-10);
    } else if (recreated) {
      this.backdrop.setTexture(BACKDROP_KEY);
    }
  }

  private buildMotes() {
    this.motes.forEach((mote) => mote.view.destroy());
    this.motes = [];
    const rand = seededRandom(97);
    for (let i = 0; i < MOTE_COUNT; i += 1) {
      const size = 0.8 + rand() * 1.8;
      const isBlood = rand() > 0.88;
      const baseAlpha = 0.15 + rand() * 0.4;
      const x = rand() * this.width;
      const y = rand() * this.height;
      const view = this.scene.add
        .circle(x, y, size, isBlood ? ARENA_HEX.bloodBright : ARENA_HEX.violetGlow, baseAlpha)
        .setDepth(-5);
      this.motes.push({ view, baseX: x, baseY: y, drift: 4 + rand() * 10, phase: rand() * Math.PI * 2, baseAlpha, depth: 0.4 + rand() * 1.2 });
    }
  }

  private buildForeground(proj: ArenaProjection) {
    this.foreground?.destroy();
    this.foreground = this.scene.add.graphics().setDepth(900);
    const rand = seededRandom(41);
    const u = proj.unit;
    // Soft shards parked near the screen edges so they never cover the table or HUD.
    this.foregroundShards = [
      { x: proj.width * 0.035, y: proj.height * 0.84, size: 34 * u * 1.6, tint: ARENA_HEX.violetMid },
      { x: proj.width * 0.965, y: proj.height * 0.1, size: 26 * u * 1.6, tint: ARENA_HEX.bloodMid },
      { x: proj.width * 0.06, y: proj.height * 0.2, size: 24 * u * 1.6, tint: ARENA_HEX.violetMid },
      { x: proj.width * 0.94, y: proj.height * 0.9, size: 30 * u * 1.6, tint: ARENA_HEX.violetMid },
    ].map((shard) => ({ ...shard, size: shard.size * (0.9 + rand() * 0.3) }));
    this.drawForeground();
  }

  private drawForeground() {
    if (!this.foreground) return;
    const g = this.foreground.clear();
    const ox = this.smoothX * -22;
    const oy = this.smoothY * -14;
    this.foregroundShards.forEach((shard) => {
      const { x, y, size, tint } = shard;
      // Stacked translucent copies fake the bokeh blur in CANVAS mode.
      [1.5, 1.25, 1].forEach((grow, index) => {
        g.fillStyle(tint, 0.07 + index * 0.05);
        g.beginPath();
        g.moveTo(x + ox, y + oy - size * grow);
        g.lineTo(x + ox + size * 0.6 * grow, y + oy);
        g.lineTo(x + ox, y + oy + size * 1.3 * grow);
        g.lineTo(x + ox - size * 0.55 * grow, y + oy);
        g.closePath();
        g.fillPath();
      });
    });
  }

  tick(deltaMs: number) {
    const dt = deltaMs * 0.001;
    this.elapsed += dt;
    this.smoothX += (this.pointerX - this.smoothX) * Math.min(1, dt * 3);
    this.smoothY += (this.pointerY - this.smoothY) * Math.min(1, dt * 3);
    this.motes.forEach((mote) => {
      const t = this.elapsed * 0.35 + mote.phase;
      mote.view.setPosition(
        mote.baseX + Math.sin(t) * mote.drift + this.smoothX * -10 * mote.depth,
        mote.baseY + Math.cos(t * 0.8) * mote.drift * 0.6 + this.smoothY * -6 * mote.depth,
      );
      mote.view.setAlpha(mote.baseAlpha * (0.6 + 0.4 * Math.sin(this.elapsed * 0.8 + mote.phase)));
    });
    this.drawForeground();
  }

  private readonly handlePointerMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.width || !this.height) return;
    this.pointerX = pointer.x / this.width - 0.5;
    this.pointerY = pointer.y / this.height - 0.5;
  };

  destroy() {
    this.scene.input?.off("pointermove", this.handlePointerMove, this);
    this.motes.forEach((mote) => mote.view.destroy());
    this.motes = [];
    this.foreground?.destroy();
    this.backdrop?.destroy();
    this.backdrop = undefined;
    if (this.scene.textures.exists(BACKDROP_KEY)) this.scene.textures.remove(BACKDROP_KEY);
  }
}
