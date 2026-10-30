import * as Phaser from "phaser";
import type { ArenaEventMap } from "../../../../libs/arenaEventBus";
import { sealPlacement } from "../../hud/passButton/passSeal";
import type { GraveyardChangeKind } from "../../hud/graveyard/graveyardChanges";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { logicalSize } from "../config/arenaScale";
import { CARD_RATIO } from "../../zones/handLayout";
import {
  CAUSE_COLOR,
  FX_BANISH,
  FX_ENTER,
  FX_MS,
  FX_REBIRTH,
  FX_REVIVE,
  KIND_COLOR,
  REDUCED_MS,
  WAIT_FOR_TARGET_MS,
  bezierPoint,
  easeIn,
  easeInOut,
  easeOut,
  moteAt,
  spiralPoint,
  stage,
  type Point
} from "../config/graveyardFxMotion";

type Fx = ArenaEventMap["GRAVEYARD_FX"];

/** Above the cards and the declare effects, under the banner (9400) and the Nexus carry (9500), so none of them is covered. */
const DEPTH = 9300;
const MAX_RUNS = 24;
/** How far above the pile the souls of a card that falls in wait before they drop. */
const MOTE_ARC = 64;

const TONES = { viewer: 0xa78bfa, opponent: 0xff6f93 } as const;
const BLOOD = 0xff2e63;
const BONE = 0xece7ff;
const SLAB = 0x1c1631;
const VOID = 0x05030a;

interface Run {
  kind: GraveyardChangeKind;
  color: number;
  pile: Point;
  /** Which way is the table from the pile: up (-1) for your own graveyard at the bottom, down (1) for the opponent's. */
  dir: -1 | 1;
  /** REVIVE: the unit that came back, found at its card as soon as the arena has drawn it. */
  unitId?: string;
  /** REBIRTH: where the soul goes. */
  hand?: Point;
  target?: Point;
  /** ms since the event; negative while it waits for its turn. */
  t: number;
  /** ms spent waiting for the revived unit's card. */
  waited: number;
  angle: number;
  reduced: boolean;
}

/**
 * What the graveyards do when they change, on the arena canvas: souls fall into a pile, rise from it to the table
 * (revive) or to the hand (rebirth), or are pulled into a void and gone (banish). The DOM tells where the piles and
 * the hand are (`GRAVEYARD_FX`), so the effect is on the real pile of whoever it belongs to. It paints with two
 * `Graphics` that are cleared only while something is playing, never takes the pointer, and leaves nothing behind.
 */
export class GraveyardFx {
  private readonly dark: Phaser.GameObjects.Graphics;
  private readonly glow: Phaser.GameObjects.Graphics;
  private runs: Run[] = [];
  private sequence = 0;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Where the card of a unit on the table is, once the arena has drawn it. */
    private readonly unitCenter: (unitId: string) => Point | undefined
  ) {
    this.dark = scene.add.graphics().setDepth(DEPTH);
    this.glow = scene.add.graphics().setDepth(DEPTH + 1).setBlendMode(Phaser.BlendModes.ADD);
    this.unsubscribe = arenaEventAdapter.on("GRAVEYARD_FX", (fx) => this.start(fx));
  }

  private start(fx: Fx) {
    const canvas = this.scene.game.canvas;
    if (!canvas || !this.scene.sys?.isActive()) return;
    const box = canvas.getBoundingClientRect();
    const size = logicalSize(this.scene.scale);
    const place = (rect: Fx["pile"]): Point => {
      const placed = sealPlacement(rect, { x: box.left, y: box.top, width: box.width, height: box.height }, size);
      return { x: placed.x, y: placed.y };
    };

    const pile = place(fx.pile);
    const dir = pile.y > size.height / 2 ? -1 : 1;
    // Into the hand: a little way into its dock, not its far edge.
    const hand = fx.hand ? place({ ...fx.hand, height: fx.hand.height * 1.1 }) : undefined;
    const reduced = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

    const color =
      fx.kind === "ENTER" ? (fx.cause ? CAUSE_COLOR[fx.cause] : undefined) ?? TONES[fx.tone] : KIND_COLOR[fx.kind];
    const fallbackHand: Point = { x: size.width / 2, y: dir === -1 ? size.height - 40 : 40 };

    this.runs.push({
      kind: fx.kind,
      color,
      pile,
      dir,
      unitId: fx.unitId,
      hand: fx.kind === "REBIRTH" ? hand ?? fallbackHand : undefined,
      t: -fx.delayMs,
      waited: 0,
      angle: this.sequence++ * 1.9,
      reduced
    });
    if (this.runs.length > MAX_RUNS) this.runs.splice(0, this.runs.length - MAX_RUNS);
  }

  tick(delta: number) {
    if (this.runs.length === 0) return;
    const size = logicalSize(this.scene.scale);
    this.dark.clear();
    this.glow.clear();

    for (const run of this.runs) {
      run.t += delta;
      if (run.t < 0) continue;
      if (run.kind === "REVIVE") this.followUnit(run, delta, size);
      this.draw(run);
    }
    this.runs = this.runs.filter((run) => run.t < (run.reduced ? REDUCED_MS : FX_MS[run.kind]));
    if (this.runs.length === 0) {
      this.dark.clear();
      this.glow.clear();
    }
  }

  /**
   * The soul of a revived unit has to land on the unit's card, which the arena draws a moment after the state
   * arrives. It waits at the pile for it (up to `WAIT_FOR_TARGET_MS`) and, if there is no card, flies on towards the table.
   */
  private followUnit(run: Run, delta: number, size: { width: number; height: number }) {
    const found = run.unitId ? this.unitCenter(run.unitId) : undefined;
    if (found) run.target = found;
    if (run.target || run.reduced) return;
    if (run.t >= FX_REVIVE.flight[0]) {
      run.waited += delta;
      run.t = FX_REVIVE.flight[0];
      if (run.waited >= WAIT_FOR_TARGET_MS) {
        run.target = { x: Math.min(size.width - 40, run.pile.x + 190), y: run.pile.y + run.dir * 170 };
      }
    }
  }

  private draw(run: Run) {
    if (run.reduced) return this.drawReduced(run);
    switch (run.kind) {
      case "ENTER":
        return this.drawEnter(run);
      case "REVIVE":
        return this.drawRevive(run);
      case "REBIRTH":
        return this.drawRebirth(run);
      case "BANISH":
        return this.drawBanish(run);
    }
  }

  /** For those who ask for less motion: one ring at the pile. */
  private drawReduced(run: Run) {
    const p = stage(run.t, 0, REDUCED_MS);
    this.glow.lineStyle(2, run.color, 1 - p);
    this.glow.strokeEllipse(run.pile.x, run.pile.y, 44 + 40 * p, 62 + 40 * p);
  }

  /** Souls fall from above into the pile, which closes on them like a mouth. */
  private drawEnter(run: Run) {
    const { pile, color, t } = run;
    const fall = stage(t, ...FX_ENTER.fall);
    const gulp = stage(t, ...FX_ENTER.gulp);
    const count = 8;

    for (let i = 0; i < count; i += 1) {
      const lag = i * 0.035;
      const head = moteAt(pile, i, count, MOTE_ARC, Math.max(0, fall - lag));
      const tail = moteAt(pile, i, count, MOTE_ARC, Math.max(0, fall - lag - 0.12));
      const alpha = (1 - gulp) * (0.35 + 0.65 * fall);
      this.glow.lineStyle(2, color, alpha * 0.5);
      this.glow.lineBetween(tail.x, tail.y, head.x, head.y);
      this.glow.fillStyle(color, alpha);
      this.glow.fillCircle(head.x, head.y, 3.4 * (1 - 0.4 * fall));
    }

    if (gulp > 0) {
      const shrink = easeOut(gulp);
      this.glow.lineStyle(2, color, 0.9 * (1 - gulp));
      this.glow.strokeEllipse(pile.x, pile.y, 2 * (40 - 30 * shrink), 2 * (54 - 42 * shrink));
      this.glow.fillStyle(BONE, 0.45 * (1 - gulp));
      this.glow.fillCircle(pile.x, pile.y, 9 * (1 - gulp * 0.4));
    }
  }

  /** A pillar of light stands on the pile and a soul rises from it, curving to the unit that is back on the table. */
  private drawRevive(run: Run) {
    const { pile, dir, color, t } = run;
    const pillar = stage(t, ...FX_REVIVE.pillar);
    const flight = stage(t, ...FX_REVIVE.flight);
    const burst = stage(t, ...FX_REVIVE.burst);

    if (pillar < 1) {
      const rise = easeOut(pillar);
      const fade = pillar < 0.65 ? 1 : 1 - (pillar - 0.65) / 0.35;
      const height = 150 * rise;
      const y = dir === -1 ? pile.y - height + 28 : pile.y - 28;
      for (const [width, alpha] of [[38, 0.1], [20, 0.2], [7, 0.55]] as const) {
        this.glow.fillStyle(color, alpha * fade);
        this.glow.fillRect(pile.x - width / 2, y, width, height);
      }
      for (let i = 0; i < 10; i += 1) {
        const lift = 8 + rise * (40 + (i % 5) * 26);
        this.glow.fillStyle(BONE, 0.7 * fade * (1 - (i % 5) * 0.12));
        this.glow.fillCircle(pile.x + Math.sin(i * 1.7) * 16, pile.y + dir * lift, 2.4);
      }
    }

    const target = run.target;
    if (target && flight > 0 && flight < 1) {
      const eased = easeInOut(flight);
      for (let k = 6; k >= 1; k -= 1) {
        const behind = bezierPoint(pile, target, 70, Math.max(0, eased - k * 0.04));
        this.glow.fillStyle(color, (1 - k / 7) * 0.6);
        this.glow.fillCircle(behind.x, behind.y, Math.max(0.8, 2.6 - k * 0.3));
      }
      const head = bezierPoint(pile, target, 70, eased);
      this.soul(head, 1 - 0.3 * flight, 1, Math.sin(flight * Math.PI) * 0.4, color, 1);
    }

    if (target && burst > 0) {
      const spread = easeOut(burst);
      this.glow.lineStyle(3, color, 1 - burst);
      this.glow.strokeCircle(target.x, target.y, 10 + 68 * spread);
      for (let i = 0; i < 10; i += 1) {
        const angle = i * 0.628;
        this.glow.fillStyle(BONE, (1 - burst) * 0.85);
        this.glow.fillCircle(target.x + Math.cos(angle) * 30 * spread, target.y + Math.sin(angle) * 20 * spread - 34 * burst, 2);
      }
    }
  }

  /** The soul turns over as it climbs to the hand, and a pale ring opens where it lands. */
  private drawRebirth(run: Run) {
    const { pile, color, t } = run;
    const hand = run.hand;
    if (!hand) return;
    const flight = stage(t, ...FX_REBIRTH.flight);
    const burst = stage(t, ...FX_REBIRTH.burst);

    if (flight < 1) {
      const eased = easeInOut(flight);
      for (let k = 6; k >= 1; k -= 1) {
        const behind = bezierPoint(pile, hand, -46, Math.max(0, eased - k * 0.04));
        this.glow.fillStyle(color, (1 - k / 7) * 0.55);
        this.glow.fillCircle(behind.x, behind.y, Math.max(0.8, 2.4 - k * 0.28));
      }
      const head = bezierPoint(pile, hand, -46, eased);
      const squash = Math.max(0.18, Math.abs(Math.cos(flight * Math.PI * 2)));
      this.soul(head, 1 - 0.45 * flight, squash, 0.35 * Math.sin(flight * Math.PI), color, 1);
    }

    if (burst > 0) {
      const spread = easeOut(burst);
      this.glow.lineStyle(2, color, 1 - burst);
      this.glow.strokeEllipse(hand.x, hand.y, 2 * (18 + 72 * spread), 2 * (8 + 28 * spread));
      for (let i = 0; i < 6; i += 1) {
        const x = hand.x + (i - 2.5) * 12;
        this.glow.lineStyle(1.4, color, (1 - burst) * 0.7);
        this.glow.lineBetween(x, hand.y, x, hand.y - 26 * spread);
      }
    }
  }

  /** A void opens on the pile and winds the soul into itself; it shuts on a single bright point. */
  private drawBanish(run: Run) {
    const { pile, t, angle } = run;
    const open = stage(t, ...FX_BANISH.open);
    const pull = stage(t, ...FX_BANISH.pull);
    const close = stage(t, ...FX_BANISH.close);
    const radius = 32 * easeOut(open) * (1 - easeIn(close));

    if (radius > 0.5) {
      this.dark.fillStyle(VOID, 0.94);
      this.dark.fillCircle(pile.x, pile.y, radius);
      this.glow.lineStyle(2.2, BLOOD, 0.9 * (1 - close));
      this.glow.strokeCircle(pile.x, pile.y, radius + 1.5);
      this.glow.lineStyle(1.4, run.color, 0.65 * (1 - close));
      this.glow.strokeCircle(pile.x, pile.y, radius + 5 + 2 * Math.sin(t * 0.03));

      // Cracks run out of the rim and flicker.
      if (Math.floor(t / 55) % 2 === 0) {
        for (let i = 0; i < 6; i += 1) {
          const a = angle + i * (Math.PI / 3);
          this.glow.lineStyle(1.3, BONE, 0.55 * (1 - close));
          this.glow.lineBetween(
            pile.x + Math.cos(a) * (radius + 2),
            pile.y + Math.sin(a) * (radius + 2),
            pile.x + Math.cos(a) * (radius + 12 + (i % 3) * 5),
            pile.y + Math.sin(a) * (radius + 12 + (i % 3) * 5)
          );
        }
      }
    }

    if (pull > 0 && pull < 1) {
      const at = spiralPoint(pile, 66, 2.2, angle, easeIn(pull));
      this.soul(at, 1 - 0.8 * pull, 1, angle + pull * 9, run.color, 1 - pull * 0.4);
    }

    if (close > 0.5) {
      const flash = (close - 0.5) / 0.5;
      this.glow.fillStyle(BONE, 1 - flash * 0.6);
      this.glow.fillCircle(pile.x, pile.y, 6 * (1 - flash) + 1);
    }
  }

  /** The silhouette of a card: a plain rectangle of the ratio of the hand's cards, square cornered, with a lit edge and a diamond in its middle. */
  private soul(at: Point, scale: number, squash: number, angle: number, color: number, alpha: number) {
    const h = 17.5 * scale;
    const w = (h / CARD_RATIO) * squash;
    const local: Array<[number, number]> = [[-w, -h], [w, -h], [w, h], [-w, h]];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const points = local.map(([x, y]) => ({ x: at.x + x * cos - y * sin, y: at.y + x * sin + y * cos }));

    this.dark.fillStyle(SLAB, 0.92 * alpha);
    this.trace(this.dark, points);
    this.dark.fillPath();
    this.glow.lineStyle(1.6, color, alpha);
    this.trace(this.glow, points);
    this.glow.strokePath();
    this.glow.fillStyle(color, 0.6 * alpha);
    this.trace(this.glow, [
      { x: at.x, y: at.y - 5 * scale },
      { x: at.x + 3.8 * scale * squash, y: at.y },
      { x: at.x, y: at.y + 5 * scale },
      { x: at.x - 3.8 * scale * squash, y: at.y }
    ]);
    this.glow.fillPath();
  }

  private trace(layer: Phaser.GameObjects.Graphics, points: Point[]) {
    layer.beginPath();
    points.forEach((point, index) => (index === 0 ? layer.moveTo(point.x, point.y) : layer.lineTo(point.x, point.y)));
    layer.closePath();
  }

  destroy() {
    this.unsubscribe();
    this.runs = [];
    this.dark.destroy();
    this.glow.destroy();
  }
}
