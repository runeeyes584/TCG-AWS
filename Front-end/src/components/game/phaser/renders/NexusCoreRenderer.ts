import * as Phaser from "phaser";
import type { PlayerId } from "@backend/game/types";
import { NEXUS_CORE_RADIUS, type ArenaProjection, type Point } from "../config/arenaProjection";
import {
  NEXUS_SEGMENTS,
  changedSegments,
  nexusCoreStyle,
  segmentArc,
  type NexusCoreStyle,
  type NexusSide
} from "../config/nexusCore";

const PLAYERS: PlayerId[] = ["P1", "P2"];

/** Traces a closed polygon on `g`; the caller fills or strokes it. */
function polygon(g: Phaser.GameObjects.Graphics, points: Array<[number, number]>) {
  g.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)));
  g.closePath();
}
const DEPTH = 5;
const SHATTER_MS = 650;
const LIGHT_MS = 320;

interface Shard {
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  size: number;
}

interface Core {
  view: Phaser.GameObjects.Container;
  ring: Phaser.GameObjects.Graphics;
  crystal: Phaser.GameObjects.Graphics;
  fx: Phaser.GameObjects.Graphics;
  hp: number;
  side: NexusSide;
  style?: NexusCoreStyle;
  center: Point;
  radius: number;
  /** Segments that are lighting up after a heal, with the ms since each started. */
  lighting: Array<{ index: number; t: number }>;
  shards: Array<Shard & { t: number }>;
  shake: number;
}

/**
 * The Nexus of each player as a core standing beside the table: a ring of twenty segments (one
 * per HP) around a faceted crystal, drawn upright (a billboard, not flattened by the camera).
 * Lit segments are the HP left; lost ones go dark and shatter into shards, healed ones light up
 * one after the other. At 11 HP the ring cracks; at 5 the lit segments beat and the core turns red.
 * The HP number itself is in the HUD (`NexusPanel`), so the ring carries none.
 */
export class NexusCoreRenderer {
  private readonly cores = new Map<PlayerId, Core>();
  private proj?: ArenaProjection;
  private viewerId: PlayerId = "P1";
  private elapsed = 0;

  constructor(private readonly scene: Phaser.Scene) {
    PLAYERS.forEach((playerId) => {
      const ring = scene.add.graphics();
      const crystal = scene.add.graphics();
      const fx = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      const view = scene.add.container(0, 0, [ring, crystal, fx]).setDepth(DEPTH);
      this.cores.set(playerId, {
        view,
        ring,
        crystal,
        fx,
        hp: NEXUS_SEGMENTS,
        side: "opponent",
        center: { x: 0, y: 0 },
        radius: NEXUS_CORE_RADIUS,
        lighting: [],
        shards: [],
        shake: 0
      });
    });
  }

  private sideOf(playerId: PlayerId): NexusSide {
    return playerId === this.viewerId ? "viewer" : "opponent";
  }

  /** Where each core stands, from the shared projection. */
  layout(proj: ArenaProjection, _signature: string) {
    this.proj = proj;
    this.cores.forEach((core, playerId) => {
      core.center = this.sideOf(playerId) === "viewer" ? proj.nexus.me : proj.nexus.opponent;
      core.radius = NEXUS_CORE_RADIUS * proj.nexus.scale;
      core.view.setPosition(core.center.x, core.center.y);
      this.draw(core);
    });
  }

  /** New HP readings: draws the ring, and plays the shatter or the light-up for the change. */
  update(hp: Record<PlayerId, number>, viewerId?: PlayerId) {
    if (viewerId) this.viewerId = viewerId;
    PLAYERS.forEach((playerId) => {
      const core = this.cores.get(playerId);
      if (!core) return;
      const side = this.sideOf(playerId);
      const previous = core.hp;
      const next = hp[playerId];
      const sideChanged = side !== core.side;
      core.side = side;

      if (next !== previous && !sideChanged && this.proj) {
        const change = changedSegments(previous, next);
        if (change.kind === "lost") this.shatter(core, change.segments);
        else if (change.kind === "gained") {
          core.lighting = change.segments.map((index, order) => ({ index, t: -order * 90 }));
        }
      }
      core.hp = next;
      if (this.proj) {
        core.center = side === "viewer" ? this.proj.nexus.me : this.proj.nexus.opponent;
        core.view.setPosition(core.center.x, core.center.y);
      }
      this.draw(core);
    });
  }

  /** Where the core is, for hit effects. */
  anchorFor(playerId: PlayerId, viewerId?: PlayerId): Point | undefined {
    if (viewerId) this.viewerId = viewerId;
    const core = this.cores.get(playerId);
    return core ? { ...core.center } : undefined;
  }

  private shatter(core: Core, segments: number[]) {
    core.shake = 1;
    segments.forEach((index) => {
      const { start, end } = segmentArc(index);
      const mid = (start + end) / 2;
      for (let k = 0; k < 5; k += 1) {
        const angle = mid + Phaser.Math.FloatBetween(-0.12, 0.12);
        const speed = Phaser.Math.FloatBetween(30, 90);
        core.shards.push({
          x: Math.cos(angle) * core.radius,
          y: Math.sin(angle) * core.radius,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 28,
          spin: Phaser.Math.FloatBetween(-6, 6),
          size: Phaser.Math.FloatBetween(2.5, 5.5) * (core.radius / NEXUS_CORE_RADIUS),
          t: 0
        });
      }
    });
  }

  private draw(core: Core) {
    const style = nexusCoreStyle(core.hp, core.side);
    core.style = style;
    const { ring, crystal } = core;
    const r = core.radius;
    const thick = Math.max(3, r * 0.12);

    ring.clear();
    // A faint disc behind the ring so it reads against the table.
    ring.fillStyle(0x07040f, 0.55);
    ring.fillCircle(0, 0, r * 0.98);
    for (let i = 0; i < NEXUS_SEGMENTS; i += 1) {
      const { start, end } = segmentArc(i);
      const lit = i < style.lit;
      if (lit) {
        ring.lineStyle(thick * 2.1, style.deep, 0.16);
        ring.beginPath();
        ring.arc(0, 0, r, start, end, false);
        ring.strokePath();
      }
      ring.lineStyle(lit ? thick : thick * 0.45, lit ? style.tone : style.deep, lit ? 0.95 : 0.22);
      ring.beginPath();
      ring.arc(0, 0, r, start, end, false);
      ring.strokePath();
    }
    if (style.cracked) this.drawCracks(ring, r, style);

    crystal.clear();
    const h = r * 0.5;
    const w = r * 0.34;
    crystal.fillStyle(style.deep, 0.28);
    crystal.fillCircle(0, 0, r * 0.42);
    const facets: Array<[number, number]> = [[0, -h], [w, 0], [0, h], [-w, 0]];
    crystal.fillStyle(style.tone, 0.95);
    polygon(crystal, facets);
    crystal.fillPath();
    crystal.fillStyle(0xffffff, 0.35);
    polygon(crystal, [[0, -h], [w, 0], [0, -h * 0.05]]);
    crystal.fillPath();
    crystal.lineStyle(Math.max(1, r * 0.025), 0xffffff, 0.8);
    polygon(crystal, facets);
    crystal.strokePath();
    crystal.lineBetween(-w, 0, w, 0);
  }

  /** A few fixed jagged lines across the ring, so a damaged core looks damaged the same way every frame. */
  private drawCracks(g: Phaser.GameObjects.Graphics, r: number, style: NexusCoreStyle) {
    g.lineStyle(Math.max(1, r * 0.022), 0x07040f, 0.95);
    [0.35, 2.2, 4.1, 5.3].forEach((angle) => {
      const a0 = { x: Math.cos(angle) * r * 1.12, y: Math.sin(angle) * r * 1.12 };
      const a1 = { x: Math.cos(angle + 0.05) * r * 0.9, y: Math.sin(angle + 0.05) * r * 0.9 };
      const a2 = { x: Math.cos(angle - 0.06) * r * 0.74, y: Math.sin(angle - 0.06) * r * 0.74 };
      g.beginPath();
      g.moveTo(a0.x, a0.y);
      g.lineTo(a1.x, a1.y);
      g.lineTo(a2.x, a2.y);
      g.strokePath();
    });
    g.lineStyle(Math.max(1, r * 0.012), style.tone, 0.5);
    g.strokeCircle(0, 0, r * 0.74);
  }

  tick(delta: number) {
    this.elapsed += delta;
    const seconds = delta / 1000;

    this.cores.forEach((core) => {
      const style = core.style;
      if (!style) return;

      // The crystal bobs a little; a dying core beats once a second.
      const bob = Math.sin(this.elapsed / 900 + (core.side === "viewer" ? 0 : 2)) * core.radius * 0.04;
      core.crystal.y = bob;
      if (style.critical) {
        const beat = Math.pow(1 - ((this.elapsed % 1000) / 1000), 3);
        core.ring.setAlpha(0.65 + 0.35 * beat);
        core.crystal.setScale(1 + 0.08 * beat);
      } else {
        core.ring.setAlpha(1);
        core.crystal.setScale(1);
      }

      // A hit shakes the core.
      if (core.shake > 0) {
        core.shake = Math.max(0, core.shake - seconds * 2.4);
        core.view.setPosition(core.center.x + Math.sin(this.elapsed / 18) * core.shake * core.radius * 0.06, core.center.y);
      } else if (core.view.x !== core.center.x) {
        core.view.setPosition(core.center.x, core.center.y);
      }

      const fx = core.fx;
      const active = core.shards.length > 0 || core.lighting.length > 0;
      if (!active) {
        fx.clear();
        return;
      }
      fx.clear();

      core.shards = core.shards.filter((s) => (s.t += delta) < SHATTER_MS);
      core.shards.forEach((s) => {
        const p = s.t / SHATTER_MS;
        const x = s.x + s.vx * (s.t / 1000);
        const y = s.y + s.vy * (s.t / 1000) + 90 * (s.t / 1000) ** 2;
        fx.fillStyle(style.tone, (1 - p) * 0.9);
        const spin = s.size * Math.cos(s.spin * p);
        polygon(fx, [[x, y - s.size], [x + spin, y], [x, y + s.size], [x - spin, y]]);
        fx.fillPath();
      });

      core.lighting = core.lighting.filter((l) => (l.t += delta) < LIGHT_MS);
      core.lighting.forEach((l) => {
        if (l.t < 0) return;
        const { start, end } = segmentArc(l.index);
        const p = l.t / LIGHT_MS;
        fx.lineStyle(Math.max(3, core.radius * 0.12) * (1.6 - 0.6 * p), 0xffffff, (1 - p) * 0.9);
        fx.beginPath();
        fx.arc(0, 0, core.radius, start, end, false);
        fx.strokePath();
      });
    });
  }

  destroy() {
    this.cores.forEach((core) => core.view.destroy());
    this.cores.clear();
  }
}
