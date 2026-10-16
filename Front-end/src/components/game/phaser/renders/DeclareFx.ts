import * as Phaser from "phaser";
import { GLIDE_MS } from "../config/declareMotion";
import type { Point } from "../config/arenaProjection";
import { ROLE_COLOR, type DeclareInfo } from "./CardRenderer";

/** Under every card (they start at depth 10), over the table and the glow of the crack. */
const DEPTH = 9;
const TRAIL_MS = 450;
/** How far behind the card each shadow lags, in ms of its own glide. */
const LAGS_MS = [70, 140];
const PUFFS = 9;
const RETREAT_COLOR = 0xc4b5fd;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, t)), 3);
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

interface Trail {
  info: DeclareInfo;
  t: number;
  /** A fixed seed per puff, so the smoke does not flicker from one frame to the next. */
  seeds: number[];
}

/**
 * The shadow step of a declared card. As the card glides from its slot in the waiting row to its
 * lane, two dim shadows of its frame follow a little behind and a few puffs of dark smoke are left
 * along the way, all fading in under half a second. It is drawn under every card, so it can never
 * cover one.
 */
export class DeclareFx {
  private readonly layer: Phaser.GameObjects.Graphics;
  private trails: Trail[] = [];

  constructor(scene: Phaser.Scene) {
    this.layer = scene.add.graphics().setDepth(DEPTH);
  }

  play(info: DeclareInfo) {
    this.trails.push({ info, t: 0, seeds: Array.from({ length: PUFFS }, () => Math.random()) });
  }

  tick(delta: number) {
    if (this.trails.length === 0) return;
    const g = this.layer;
    g.clear();
    this.trails = this.trails.filter((trail) => (trail.t += delta) < TRAIL_MS);

    this.trails.forEach((trail) => {
      const { info, t, seeds } = trail;
      const fade = 1 - t / TRAIL_MS;
      // A card taken back is shown in a plain violet, not in the colour of the lane it declared into.
      const color = info.retreat ? RETREAT_COLOR : ROLE_COLOR[info.role];
      const at = (ms: number) => lerp(info.from, info.to, easeOutCubic(ms / GLIDE_MS));

      // Smoke along the path the card has taken so far.
      const reached = Math.min(1, easeOutCubic(t / GLIDE_MS));
      seeds.forEach((seed, i) => {
        const along = (i / (PUFFS - 1)) * reached;
        const p = lerp(info.from, info.to, along);
        const rise = (t / TRAIL_MS) * 18 * (0.5 + seed);
        g.fillStyle(0x1b1030, 0.3 * fade);
        g.fillCircle(p.x + (seed - 0.5) * 16, p.y - rise, 5 + 9 * seed + 6 * (1 - fade));
        g.fillStyle(color, 0.05 * fade);
        g.fillCircle(p.x + (seed - 0.5) * 16, p.y - rise, 3 + 4 * seed);
      });

      // Two shadows of the frame, each a little further behind the card.
      LAGS_MS.forEach((lag, k) => {
        const p = at(Math.max(0, t - lag));
        const w = info.width * (info.champion ? 1.04 : 1);
        g.fillStyle(0x07040f, (0.38 - 0.14 * k) * fade);
        g.fillRect(p.x - w / 2, p.y - info.height / 2, w, info.height);
        g.lineStyle(1.5, color, (0.55 - 0.2 * k) * fade);
        g.strokeRect(p.x - w / 2, p.y - info.height / 2, w, info.height);
      });
    });

    if (this.trails.length === 0) g.clear();
  }

  destroy() {
    this.trails = [];
    this.layer.destroy();
  }
}
