import * as Phaser from "phaser";
import { rowKeyFor, type ArenaProjection, type Point } from "../config/arenaProjection";
import type { LaneLink } from "../config/laneLinks";
import { crackYAt, riftPolyline } from "../config/riftLine";
import { ROLE_COLOR } from "./CardRenderer";

/** Under the cards (which start at depth 10), over the crack's glow (2,5) and the shards (2,4). */
const DEPTH = { blades: 2.6, gates: 2.7 } as const;
const GROW_MS = 280;
const GATE_IN_MS = 200;
const LOCK_FLASH_MS = 300;
const FADE_OUT_MS = 220;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);

interface LaneState {
  link: LaneLink;
  /** When the lane first appeared and when its blocker came (ms of this scene's clock). */
  bornAt: number;
  lockedAt?: number;
  /** Set once the lane is gone: it fades out instead of vanishing. */
  dyingAt?: number;
}

const reduced = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/**
 * The lanes of a combat as they cross the rift. From each attacker a thin blade of light grows along
 * its column, over the crack, to the active slot facing it; where the column crosses the crack a gate
 * opens (a hollow diamond, blood-red) and, when a blocker is put in front of the attacker, locks (a
 * solid gold diamond between two bars, with a flash). A lane with a champion in it is drawn larger.
 * Everything is drawn under the cards, so it can show or cross nothing that matters. Lanes that are
 * already there when the scene starts, or all of them when motion is reduced, are simply drawn at rest.
 */
export class LaneBlades {
  private readonly blades: Phaser.GameObjects.Graphics;
  private readonly gates: Phaser.GameObjects.Graphics;
  private readonly lanes = new Map<string, LaneState>();
  private proj?: ArenaProjection;
  private crack: Point[] = [];
  private elapsed = 0;
  private seen = false;

  constructor(scene: Phaser.Scene) {
    this.blades = scene.add.graphics().setDepth(DEPTH.blades).setBlendMode(Phaser.BlendModes.ADD);
    this.gates = scene.add.graphics().setDepth(DEPTH.gates).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** The lanes of the combat now, and the projection they are drawn with. Called each time the arena is drawn. */
  setLanes(links: LaneLink[], proj: ArenaProjection) {
    this.proj = proj;
    this.crack = riftPolyline(proj);
    const settled = !this.seen || reduced();
    this.seen = true;
    const live = new Set<string>();

    links.forEach((link) => {
      live.add(link.attackerId);
      const state = this.lanes.get(link.attackerId);
      if (!state) {
        this.lanes.set(link.attackerId, {
          link,
          bornAt: settled ? -Infinity : this.elapsed,
          lockedAt: link.blocked ? (settled ? -Infinity : this.elapsed) : undefined
        });
        return;
      }
      if (!state.link.blocked && link.blocked) state.lockedAt = settled ? -Infinity : this.elapsed;
      if (state.link.blocked && !link.blocked) state.lockedAt = undefined;
      state.link = link;
      state.dyingAt = undefined;
    });

    this.lanes.forEach((state, id) => {
      if (live.has(id)) return;
      if (state.dyingAt === undefined) state.dyingAt = settled ? -Infinity : this.elapsed;
    });
  }

  tick(delta: number) {
    this.elapsed += delta;
    const blades = this.blades;
    const gates = this.gates;
    blades.clear();
    gates.clear();
    const proj = this.proj;
    if (!proj || this.lanes.size === 0) return;

    this.lanes.forEach((state, id) => {
      const fade = state.dyingAt === undefined ? 1 : 1 - clamp01((this.elapsed - state.dyingAt) / FADE_OUT_MS);
      if (fade <= 0) {
        this.lanes.delete(id);
        return;
      }
      this.drawLane(blades, gates, proj, state, fade);
    });
  }

  private drawLane(blades: Phaser.GameObjects.Graphics, gates: Phaser.GameObjects.Graphics, proj: ArenaProjection, state: LaneState, fade: number) {
    const { link } = state;
    const attackerRow = rowKeyFor(link.attackerSide === "viewer", "active");
    const defenderRow = rowKeyFor(link.attackerSide !== "viewer", "active");
    const origin = proj.slot(attackerRow, link.column);
    const target = proj.slot(defenderRow, link.column).center;
    const color = link.blocked ? ROLE_COLOR.defend : ROLE_COLOR.attack;
    const scale = (link.champion ? 1.5 : 1) * Math.max(1, proj.unit * 1.6);

    // The blade grows from the attacker to the slot facing it.
    const grow = easeOutCubic((this.elapsed - state.bornAt) / GROW_MS);
    const head: Point = {
      x: origin.center.x + (target.x - origin.center.x) * grow,
      y: origin.center.y + (target.y - origin.center.y) * grow
    };
    [
      { w: 14 * scale, a: 0.14 },
      { w: 6 * scale, a: 0.4 },
      { w: 2.2 * scale, a: 1 }
    ].forEach(({ w, a }) => {
      blades.lineStyle(w, color, a * fade);
      blades.lineBetween(origin.center.x, origin.center.y, head.x, head.y);
    });
    this.diamond(blades, head, 5 * scale, color, 0.95 * fade, true);
    if (link.blocked && grow >= 1) this.diamond(blades, target, 4 * scale, color, 0.7 * fade, false);

    // The gate where the column crosses the crack.
    const u = (origin.bounds.u0 + origin.bounds.u1) / 2;
    const gx = proj.project(0.5, u).x;
    const gate: Point = { x: gx, y: crackYAt(this.crack, gx) };
    const opening = easeOutCubic((this.elapsed - state.bornAt) / GATE_IN_MS);
    const size = 9 * scale * (0.4 + 0.6 * opening);
    if (!link.blocked) {
      // Open: a hollow diamond that breathes.
      const pulse = 0.55 + 0.3 * Math.sin(this.elapsed / 450);
      gates.fillStyle(color, 0.1 * fade * opening);
      gates.fillCircle(gate.x, gate.y, size * 1.8);
      this.diamond(gates, gate, size, color, pulse * fade * opening, false);
      return;
    }

    // Locked: a solid diamond between two bars, with a flash as it closes.
    const sinceLock = this.elapsed - (state.lockedAt ?? -Infinity);
    const flash = 1 - clamp01(sinceLock / LOCK_FLASH_MS);
    gates.fillStyle(color, 0.16 * fade);
    gates.fillCircle(gate.x, gate.y, size * 1.8);
    this.diamond(gates, gate, size, color, 0.95 * fade, true);
    gates.lineStyle(2 * scale, color, 0.9 * fade);
    [-1, 1].forEach((side) => {
      gates.lineBetween(gate.x + side * size * 1.5, gate.y - size * 0.6, gate.x + side * size * 1.5, gate.y + size * 0.6);
    });
    if (flash > 0) {
      gates.lineStyle(2 * scale, 0xffffff, 0.8 * flash * fade);
      gates.strokeCircle(gate.x, gate.y, size * (1.2 + 2.4 * (1 - flash)));
    }
  }

  private diamond(g: Phaser.GameObjects.Graphics, at: Point, r: number, color: number, alpha: number, filled: boolean) {
    g.beginPath();
    g.moveTo(at.x, at.y - r);
    g.lineTo(at.x + r, at.y);
    g.lineTo(at.x, at.y + r);
    g.lineTo(at.x - r, at.y);
    g.closePath();
    if (filled) {
      g.fillStyle(color, alpha);
      g.fillPath();
    } else {
      g.lineStyle(1.8, color, alpha);
      g.strokePath();
    }
  }

  destroy() {
    this.lanes.clear();
    this.blades.destroy();
    this.gates.destroy();
  }
}
