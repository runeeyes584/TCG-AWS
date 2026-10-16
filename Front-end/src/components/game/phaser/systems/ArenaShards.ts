import * as Phaser from "phaser";
import type { ArenaProjection, Point } from "../config/arenaProjection";
import { ARENA_HEX } from "../config/arenaTheme";

type Phase = "wait" | "in" | "hold" | "out";

interface Shard {
  view: Phaser.GameObjects.Graphics;
  phase: Phase;
  elapsed: number;
  waitMs: number;
  inMs: number;
  holdMs: number;
  outMs: number;
  origin: Point;
  drift: number;
  peakAlpha: number;
  spin: number;
}

/**
 * Violet / blood-red diamond shards that keep appearing and fading around the
 * table: along the rim, hovering over the rift and drifting in the side margins.
 * Driven from the scene's update loop (no per-shard tweens).
 */
export class ArenaShards {
  private shards: Shard[] = [];
  private proj?: ArenaProjection;
  private signature = "";

  constructor(private readonly scene: Phaser.Scene) {}

  layout(proj: ArenaProjection, signature: string) {
    this.proj = proj;
    if (signature === this.signature && this.shards.length) return;
    this.signature = signature;
    this.shards.forEach((shard) => shard.view.destroy());
    const count = Math.round(Math.min(48, Math.max(24, (proj.width * proj.height) / 42000)));
    this.shards = Array.from({ length: count }, (_, index) => this.spawn(this.createShard(), index * 140));
  }

  private createShard(): Shard {
    const view = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    return { view, phase: "wait", elapsed: 0, waitMs: 0, inMs: 0, holdMs: 0, outMs: 0, origin: { x: 0, y: 0 }, drift: 0, peakAlpha: 1, spin: 0 };
  }

  private pickOrigin(): { point: Point; depth: number } {
    const proj = this.proj!;
    const roll = Math.random();
    if (roll < 0.42) {
      // Around the rim: sides, far edge and near edge, pushed slightly outwards.
      const edge = Math.random();
      if (edge < 0.6) {
        const side = Math.random() < 0.5 ? -1 : 1;
        const s = Phaser.Math.FloatBetween(-0.02, 1.02);
        const p = proj.project(s, side * Phaser.Math.FloatBetween(1.05, 1.22));
        return { point: { x: p.x, y: p.y - Phaser.Math.Between(0, 30) }, depth: 4 };
      }
      const s = edge < 0.85 ? Phaser.Math.FloatBetween(1.04, 1.12) : Phaser.Math.FloatBetween(-0.12, -0.06);
      const p = proj.project(s, Phaser.Math.FloatBetween(-1, 1));
      return { point: { x: p.x, y: p.y - Phaser.Math.Between(4, 26) }, depth: 4 };
    }
    if (roll < 0.76) {
      // Over the rift.
      const p = proj.project(0.5, Phaser.Math.FloatBetween(-1.02, 1.02));
      return { point: { x: p.x, y: p.y - Phaser.Math.Between(6, 46) }, depth: 6 };
    }
    // Free-floating in the dark margins either side of the table.
    const side = Math.random() < 0.5 ? -1 : 1;
    const s = Phaser.Math.FloatBetween(0.1, 0.95);
    const edge = proj.project(s, side * 1.05);
    const gap = side < 0 ? edge.x - 140 : proj.width - 140 - edge.x;
    const x = edge.x + side * Phaser.Math.FloatBetween(20, Math.max(30, gap));
    return { point: { x, y: edge.y + Phaser.Math.Between(-40, 40) }, depth: 3 };
  }

  private spawn(shard: Shard, extraWait = 0): Shard {
    if (!this.proj) return shard;
    const { point, depth } = this.pickOrigin();
    const isBlood = Math.random() < 0.35;
    const size = Phaser.Math.FloatBetween(4, 13) * this.proj.unit * 1.7;
    const color = isBlood ? ARENA_HEX.bloodBright : Math.random() < 0.5 ? ARENA_HEX.violetGlow : ARENA_HEX.violetBright;

    const g = shard.view.clear();
    const diamond = (scale: number, alpha: number, fill: number) => {
      g.fillStyle(fill, alpha);
      g.beginPath();
      g.moveTo(0, -size * scale);
      g.lineTo(size * 0.55 * scale, 0);
      g.lineTo(0, size * 1.25 * scale);
      g.lineTo(-size * 0.5 * scale, 0);
      g.closePath();
      g.fillPath();
    };
    diamond(2.3, 0.08, color);
    diamond(1.55, 0.18, color);
    diamond(1, 0.85, color);
    g.lineStyle(1, 0xffffff, 0.55);
    g.lineBetween(0, -size, 0, size * 1.25);

    shard.view.setPosition(point.x, point.y).setAlpha(0).setDepth(depth).setAngle(Phaser.Math.Between(-18, 18));
    shard.origin = point;
    shard.phase = "wait";
    shard.elapsed = 0;
    shard.waitMs = Phaser.Math.Between(150, 1700) + extraWait;
    shard.inMs = Phaser.Math.Between(550, 1100);
    shard.holdMs = Phaser.Math.Between(500, 1700);
    shard.outMs = Phaser.Math.Between(900, 1700);
    shard.drift = Phaser.Math.Between(12, 38);
    shard.peakAlpha = Phaser.Math.FloatBetween(0.55, 1);
    shard.spin = Phaser.Math.FloatBetween(-12, 12);
    return shard;
  }

  tick(deltaMs: number) {
    this.shards.forEach((shard) => {
      shard.elapsed += deltaMs;
      const life = shard.inMs + shard.holdMs + shard.outMs;
      if (shard.phase === "wait") {
        if (shard.elapsed < shard.waitMs) return;
        shard.phase = "in";
        shard.elapsed = 0;
      }
      const t = shard.elapsed;
      let alpha: number;
      if (t < shard.inMs) {
        shard.phase = "in";
        alpha = Phaser.Math.Easing.Sine.Out(t / shard.inMs);
      } else if (t < shard.inMs + shard.holdMs) {
        shard.phase = "hold";
        alpha = 1;
      } else if (t < life) {
        shard.phase = "out";
        alpha = 1 - Phaser.Math.Easing.Sine.In((t - shard.inMs - shard.holdMs) / shard.outMs);
      } else {
        this.spawn(shard);
        return;
      }
      const progress = Math.min(1, t / life);
      shard.view.setAlpha(alpha * shard.peakAlpha);
      shard.view.setPosition(shard.origin.x, shard.origin.y - shard.drift * progress);
      shard.view.setScale(0.75 + 0.35 * Math.sin(Math.min(1, t / shard.inMs) * Math.PI * 0.5));
      shard.view.setAngle(shard.view.angle + (shard.spin * deltaMs) / 1000);
    });
  }

  destroy() {
    this.shards.forEach((shard) => shard.view.destroy());
    this.shards = [];
  }
}
