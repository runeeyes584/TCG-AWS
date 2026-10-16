import * as Phaser from "phaser";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { ARENA_HEX } from "../config/arenaTheme";
import type { ArenaProjection, Point } from "../config/arenaProjection";
import { ARENA_COLUMNS } from "../config/arenaProjection";
import { riftPolyline } from "../config/riftLine";
import { actorDirection, laneRowsFor, pulsePositions, type TurnOwner } from "../config/riftMotion";
import type { ArenaEventMap } from "../../../../libs/arenaEventBus";
import { acquireCanvasTexture } from "./canvasTexture";

type Owner = ArenaEventMap["TURN_OWNER"];

/** Under the cards (which start at depth 10), over the table and its lane fills (1). */
const DEPTH = { lanes: 1.05, spill: 1.06, pulses: 2.35, shards: 2.4 } as const;
const BREATH_MS = 3600;
const PULSE_MS = 2400;
const SHARD_EVERY_MS = 450;
const BURST_SHARDS = 14;
const NEUTRAL = ARENA_HEX.violetBright;
const TONES: Record<TurnOwner, number> = { you: 0x34d399, opponent: 0xff2e63 };

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  spin: number;
  age: number;
  life: number;
}

const reduced = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * The rift as something alive, under the cards. Light spills from the crack onto the half of the
 * table of whoever acts, whose lanes glow at the rim; pulses run from the middle out to both rims;
 * and crystal shards rise from the crack towards the actor, with a burst when the turn changes
 * hands. All of it follows the same crack the table paints (`riftPolyline`). Reduced motion keeps
 * the light still and drops the pulses and shards. (Nothing is drawn in the middle of the table:
 * the sigil ring and the old rune circle were removed.)
 */
export class RiftSigil {
  private readonly lanes: Phaser.GameObjects.Graphics;
  private readonly spillDown: Phaser.GameObjects.Image;
  private readonly spillUp: Phaser.GameObjects.Image;
  private readonly pulses: Phaser.GameObjects.Graphics;
  private readonly shardLayer: Phaser.GameObjects.Graphics;
  private readonly textureKeys = new Set<string>();
  private readonly unsubscribe: Array<() => void>;

  private proj?: ArenaProjection;
  private crack: Point[] = [];
  private cx = 0;
  private riftY = 0;
  private halfWidth = 0;
  private owner: Owner;
  private elapsed = 0;
  private spillAlpha = { down: 0, up: 0 };
  private shards: Shard[] = [];
  private shardClock = 0;
  private spillTone?: number;

  constructor(private readonly scene: Phaser.Scene) {
    this.lanes = scene.add.graphics().setDepth(DEPTH.lanes);
    this.spillDown = scene.add.image(0, 0, this.spillTexture(NEUTRAL)).setOrigin(0.5, 0).setDepth(DEPTH.spill).setAlpha(0);
    this.spillUp = scene.add.image(0, 0, this.spillTexture(NEUTRAL)).setOrigin(0.5, 1).setFlipY(true).setDepth(DEPTH.spill).setAlpha(0);
    this.pulses = scene.add.graphics().setDepth(DEPTH.pulses);
    this.shardLayer = scene.add.graphics().setDepth(DEPTH.shards);

    // Phaser starts after React has reported the first turn, so pick up the last report first.
    this.owner = arenaEventAdapter.latest("TURN_OWNER");
    this.unsubscribe = [
      arenaEventAdapter.on("TURN_OWNER", (owner) => (this.owner = owner)),
      arenaEventAdapter.on("TURN_BANNER", (banner) => this.burst(banner))
    ];
  }

  /** A vertical gradient (opaque at the crack, clear away from it) in one colour, baked in: Canvas ignores tints. */
  private spillTexture(color: number) {
    const key = `rift-spill-${color.toString(16)}`;
    this.textureKeys.add(key);
    if (!this.scene.textures.exists(key)) {
      const { texture, ctx } = acquireCanvasTexture(this.scene, key, 8, 128);
      const rgb = `${(color >> 16) & 255},${(color >> 8) & 255},${color & 255}`;
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, `rgba(${rgb},0.9)`);
      g.addColorStop(0.35, `rgba(${rgb},0.3)`);
      g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 8, 128);
      texture.refresh();
    }
    return key;
  }

  /** Where the rift is, from the shared projection. */
  layout(proj: ArenaProjection) {
    this.proj = proj;
    this.crack = riftPolyline(proj);
    this.cx = proj.cx;
    this.riftY = proj.riftY;
    this.halfWidth = (proj.project(0.5, 1.04).x - proj.project(0.5, -1.04).x) / 2;
    const width = this.halfWidth * 1.9;
    const height = proj.height * 0.2;
    this.spillDown.setPosition(this.cx, this.riftY).setDisplaySize(width, height);
    this.spillUp.setPosition(this.cx, this.riftY).setDisplaySize(width, height);
  }

  /** The turn changed hands: a full banner launches a burst of shards from the crack. */
  private burst(banner: ArenaEventMap["TURN_BANNER"]) {
    if (banner.mode !== "full" || reduced() || this.crack.length === 0) return;
    for (let i = 0; i < BURST_SHARDS; i += 1) this.emitShard(banner.owner, 1.4);
  }

  /** The crack's y at a given x, by interpolating between its points. */
  private crackY(x: number) {
    const pts = this.crack;
    if (pts.length === 0) return this.riftY;
    if (x <= pts[0].x) return pts[0].y;
    for (let i = 1; i < pts.length; i += 1) {
      if (x <= pts[i].x) {
        const t = (x - pts[i - 1].x) / (pts[i].x - pts[i - 1].x || 1);
        return pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t;
      }
    }
    return pts[pts.length - 1].y;
  }

  private emitShard(owner: TurnOwner, speed = 1) {
    const x = this.cx + Phaser.Math.FloatBetween(-0.9, 0.9) * this.halfWidth;
    this.shards.push({
      x,
      y: this.crackY(x),
      vx: Phaser.Math.FloatBetween(-12, 12),
      vy: actorDirection(owner) * Phaser.Math.FloatBetween(60, 160) * speed,
      size: Phaser.Math.FloatBetween(4, 9),
      spin: Phaser.Math.FloatBetween(-3, 3),
      age: 0,
      life: Phaser.Math.FloatBetween(700, 1100)
    });
  }

  tick(delta: number) {
    if (!this.proj || this.crack.length === 0) return;
    this.elapsed += delta;
    const seconds = delta / 1000;
    const still = reduced();
    const owner = this.owner;
    const tone = owner ? TONES[owner] : NEUTRAL;
    const breath = still ? 0.5 : 0.5 + 0.5 * Math.sin((this.elapsed / BREATH_MS) * Math.PI * 2);

    this.drawSpill(owner, tone, breath, seconds);
    this.drawLanes(owner, tone, breath);
    this.drawPulses(owner, tone, still);
    this.drawShards(owner, tone, delta, still);
  }

  /** Light from the crack onto the half of the table of whoever acts, crossfading when the turn passes. */
  private drawSpill(owner: Owner, tone: number, breath: number, seconds: number) {
    if (this.spillTone !== tone) {
      this.spillTone = tone;
      const key = this.spillTexture(tone);
      this.spillDown.setTexture(key);
      this.spillUp.setTexture(key);
    }
    const level = 0.1 + 0.12 * breath;
    const target = {
      down: owner && actorDirection(owner) === 1 ? level : 0,
      up: owner && actorDirection(owner) === -1 ? level : 0
    };
    const ease = 1 - Math.pow(0.001, seconds); // about 300 ms to settle
    this.spillAlpha.down += (target.down - this.spillAlpha.down) * ease;
    this.spillAlpha.up += (target.up - this.spillAlpha.up) * ease;
    this.spillDown.setAlpha(this.spillAlpha.down);
    this.spillUp.setAlpha(this.spillAlpha.up);
  }

  /** A thin glowing rim on the lanes of the acting half; they stay under the cards. */
  private drawLanes(owner: Owner, tone: number, breath: number) {
    const g = this.lanes;
    g.clear();
    if (!owner || !this.proj) return;
    const proj = this.proj;
    laneRowsFor(owner).forEach((row) => {
      for (let column = 0; column < ARENA_COLUMNS; column += 1) {
        const [a, b, c, d] = proj.slot(row, column).quad;
        [
          { w: 5, a: 0.02 + 0.03 * breath },
          { w: 1.5, a: 0.07 + 0.1 * breath }
        ].forEach(({ w, a: alpha }) => {
          g.lineStyle(w, tone, alpha);
          g.beginPath();
          g.moveTo(a.x, a.y);
          g.lineTo(b.x, b.y);
          g.lineTo(c.x, c.y);
          g.lineTo(d.x, d.y);
          g.closePath();
          g.strokePath();
        });
      }
    });
  }

  /** Small lights that run from the middle of the crack out to both rims. */
  private drawPulses(owner: Owner, tone: number, still: boolean) {
    const g = this.pulses;
    g.clear();
    if (!owner || still) return;
    pulsePositions(this.elapsed, 3, PULSE_MS).forEach((pos) => {
      const fade = Math.pow(1 - pos, 0.7);
      [-1, 1].forEach((side) => {
        for (let k = 0; k < 5; k += 1) {
          const back = Math.max(0, pos - k * 0.018);
          const x = this.cx + side * back * this.halfWidth;
          g.fillStyle(tone, (1 - k / 5) * 0.8 * fade);
          g.fillCircle(x, this.crackY(x), Math.max(0.8, 3 - k * 0.5));
        }
      });
    });
  }

  /** Crystal shards rising from the crack towards whoever acts. */
  private drawShards(owner: Owner, tone: number, delta: number, still: boolean) {
    const g = this.shardLayer;
    g.clear();
    if (still) {
      this.shards = [];
      return;
    }
    if (owner) {
      this.shardClock += delta;
      if (this.shardClock >= SHARD_EVERY_MS) {
        this.shardClock = 0;
        this.emitShard(owner);
      }
    }
    const seconds = delta / 1000;
    this.shards = this.shards.filter((s) => (s.age += delta) < s.life);
    this.shards.forEach((s) => {
      s.x += s.vx * seconds;
      s.y += s.vy * seconds;
      const p = s.age / s.life;
      const r = s.size * (1 - p * 0.4);
      const w = r * Math.cos(s.spin * p * 2);
      g.fillStyle(tone, (1 - p) * 0.85);
      g.beginPath();
      g.moveTo(s.x, s.y - r);
      g.lineTo(s.x + w, s.y);
      g.lineTo(s.x, s.y + r);
      g.lineTo(s.x - w, s.y);
      g.closePath();
      g.fillPath();
    });
  }

  destroy() {
    this.unsubscribe.forEach((off) => off());
    [this.lanes, this.spillDown, this.spillUp, this.pulses, this.shardLayer].forEach((o) => o.destroy());
    this.textureKeys.forEach((key) => {
      if (this.scene.textures?.exists(key)) this.scene.textures.remove(key);
    });
    this.textureKeys.clear();
    this.shards = [];
  }
}
