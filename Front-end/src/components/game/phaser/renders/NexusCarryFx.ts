import * as Phaser from "phaser";
import { logicalSize } from "../config/arenaScale";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { sealPlacement } from "../../hud/passButton/passSeal";
import type { ArenaEventMap } from "../../../../libs/arenaEventBus";

type Carry = ArenaEventMap["NEXUS_CARRY"];
type Step = Carry["steps"][number];

interface Spot {
  x: number;
  y: number;
  r: number;
}

interface Flight {
  kind: "store" | "dissolve";
  from: Spot;
  to: Spot;
  tone: number;
  /** ms since the event, negative while it waits its turn. */
  t: number;
  duration: number;
}

const FLIGHT_MS = 520;
const STAGGER_MS = 160;
const DUST_MS = 700;
const BURST_MS = 380;
const GOLD = 0xe8c26a;
const TONES = { viewer: 0xc4b5fd, opponent: 0xff6f93 } as const;

const mix = (a: number, b: number, t: number) => {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * The left-over mana of a round turning into spell mana. The DOM panel reports where its gems and
 * shards are (`NEXUS_CARRY`); this flies a diamond between them along a curve with a dotted trail,
 * blooms a gold ring where it lands, and turns a gem that no longer fits to dust. It paints on
 * the arena canvas behind the HUD, which is transparent where the panel has no box.
 */
export class NexusCarryFx {
  private readonly layer: Phaser.GameObjects.Graphics;
  private flights: Flight[] = [];
  private readonly unsubscribe: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    this.layer = scene.add.graphics().setDepth(9500).setBlendMode(Phaser.BlendModes.ADD);
    this.unsubscribe = arenaEventAdapter.on("NEXUS_CARRY", (carry) => this.play(carry));
  }

  private spot(rect: { x: number; y: number; width: number; height: number }): Spot | undefined {
    const canvas = this.scene.game.canvas;
    if (!canvas) return undefined;
    const box = canvas.getBoundingClientRect();
    const placed = sealPlacement(rect, { x: box.left, y: box.top, width: box.width, height: box.height }, logicalSize(this.scene.scale));
    return { x: placed.x, y: placed.y, r: placed.radius };
  }

  private play(carry: Carry) {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !this.scene.sys?.isActive()) return;
    const tone = TONES[carry.tone];
    carry.steps.forEach((step: Step, index) => {
      const from = this.spot(step.from);
      const to = step.kind === "store" ? this.spot(step.to) : from;
      if (!from || !to) return;
      this.flights.push({
        kind: step.kind,
        from,
        to,
        tone,
        t: -index * STAGGER_MS,
        duration: step.kind === "store" ? FLIGHT_MS : DUST_MS
      });
    });
  }

  /** A point on the quadratic curve that bows away from the table, towards the screen edge. */
  private along(f: Flight, p: number) {
    const midX = (f.from.x + f.to.x) / 2;
    const midY = (f.from.y + f.to.y) / 2;
    const bow = 36 + Math.abs(f.to.y - f.from.y) * 0.18;
    const cx = midX + bow;
    const cy = midY;
    const u = 1 - p;
    return {
      x: u * u * f.from.x + 2 * u * p * cx + p * p * f.to.x,
      y: u * u * f.from.y + 2 * u * p * cy + p * p * f.to.y
    };
  }

  private diamond(x: number, y: number, r: number, color: number, alpha: number) {
    this.layer.fillStyle(color, alpha);
    this.layer.beginPath();
    this.layer.moveTo(x, y - r);
    this.layer.lineTo(x + r, y);
    this.layer.lineTo(x, y + r);
    this.layer.lineTo(x - r, y);
    this.layer.closePath();
    this.layer.fillPath();
  }

  tick(delta: number) {
    if (this.flights.length === 0) return;
    this.layer.clear();
    this.flights.forEach((f) => (f.t += delta));
    this.flights = this.flights.filter((f) => f.t < f.duration + (f.kind === "store" ? BURST_MS : 0));

    this.flights.forEach((f) => {
      if (f.t < 0) return;
      const size = Math.max(5, f.from.r * 1.5);
      if (f.kind === "dissolve") {
        const p = Math.min(1, f.t / f.duration);
        for (let k = 0; k < 10; k += 1) {
          const angle = k * 0.63 + 0.4;
          const dist = (6 + k * 2.6) * p * (size / 8);
          const up = (4 + (k % 3) * 5) * p * (size / 8);
          this.layer.fillStyle(f.tone, (1 - p) * 0.85);
          this.layer.fillCircle(f.from.x + Math.cos(angle) * dist, f.from.y + Math.sin(angle) * dist - up, Math.max(0.6, (2.4 - k * 0.15) * (1 - p * 0.6)));
        }
        return;
      }

      const flying = Math.min(1, f.t / f.duration);
      if (f.t <= f.duration) {
        const p = easeInOut(flying);
        // Dotted trail: the positions the diamond just passed.
        for (let k = 1; k <= 9; k += 1) {
          const back = Math.max(0, p - k * 0.035);
          const q = this.along(f, back);
          this.layer.fillStyle(mix(f.tone, GOLD, back), (1 - k / 10) * 0.7);
          this.layer.fillCircle(q.x, q.y, Math.max(0.8, 2.2 - k * 0.15));
        }
        const head = this.along(f, p);
        const color = mix(f.tone, GOLD, p);
        this.diamond(head.x, head.y, size * (1 + 0.15 * Math.sin(p * Math.PI)), color, 0.35);
        this.diamond(head.x, head.y, size * 0.7, color, 0.95);
      } else {
        // Landed: a gold ring blooms where the shard lights up.
        const b = (f.t - f.duration) / BURST_MS;
        this.layer.lineStyle(2, GOLD, 1 - b);
        this.layer.strokeCircle(f.to.x, f.to.y, size * (0.8 + b * 2.6));
      }
    });

    if (this.flights.length === 0) this.layer.clear();
  }

  destroy() {
    this.unsubscribe();
    this.flights = [];
    this.layer.destroy();
  }
}
