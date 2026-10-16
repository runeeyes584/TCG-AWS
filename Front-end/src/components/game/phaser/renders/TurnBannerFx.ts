import * as Phaser from "phaser";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import type { ArenaProjection, Point } from "../config/arenaProjection";
import { riftPolyline } from "../config/riftLine";
import { BANNER, actorDirection, easeOutCubic, lensPoints, phaseProgress, sampleTargets } from "../config/riftMotion";
import type { ArenaEventMap } from "../../../../libs/arenaEventBus";
import { acquireCanvasTexture } from "./canvasTexture";
import { fontFamily } from "./cardFace";

type Banner = ArenaEventMap["TURN_BANNER"];
type Owner = ArenaEventMap["TURN_OWNER"];

const DEPTH = 9400;
/** The glow along the crack and its flare: over the table, under the lanes' blades and every card. */
const GLOW_DEPTH = 2.5;
const BREATH_MS = 3600;
const MAX_PIECES = 360;
const SAMPLE_STEP_PX = 5;

/** Emerald for the turn of the viewer, blood-red for the opponent's: who acts now, not whose side. */
const TONES = {
  you: { line: 0x34d399, text: "#a7f3d0", glow: "#34d399", label: "YOUR TURN" },
  opponent: { line: 0xff2e63, text: "#ffb3c4", glow: "#ff2e63", label: "ENEMY TURN" }
} as const;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** One crystal piece of the text: it flies in from the rim to its place, and flies out again when the text breaks up. */
interface Piece {
  /** Place in the text, relative to the text's resting position. */
  dx: number;
  dy: number;
  /** Where it flies in from, relative to the middle of the rift. */
  fromX: number;
  fromY: number;
  /** When it sets off (ms into the gather): by how far from the middle of the text it lies. */
  delay: number;
  /** Drift when the text breaks up (px over the break-up). */
  outX: number;
  outY: number;
}

interface Run {
  banner: Banner;
  t: number;
  duration: number;
  pieces: Piece[];
}

/**
 * Who acts now, on the table. The rift stays a quiet violet seam; this lays a glow over it in the
 * colour of whoever holds the turn (emerald: you, blood-red: the opponent) that breathes all turn
 * long. When the turn changes hands the glow flares along the crack and, in `full` mode (1.4 s), the
 * eye of the rift opens on the crack (a vertical slit for the opponent, a diamond for you, looking
 * towards whoever acts), `YOUR TURN` / `ENEMY TURN` gathers out of crystal pieces flying in from the
 * rims onto a dark band above the rift, a light sweep crosses the table, the screen edges glow, and
 * at the end the text breaks up again. A `flash` is only the flare. It paints on the arena canvas,
 * above the table and cards, under the DOM HUD, and never takes the pointer. Reduced motion keeps a
 * steady glow and the text fading in place.
 */
export class TurnBannerFx {
  private readonly ambient: Phaser.GameObjects.Graphics;
  private readonly scrim: Phaser.GameObjects.Image;
  private readonly flare: Phaser.GameObjects.Graphics;
  private readonly eye: Phaser.GameObjects.Graphics;
  private readonly rules: Phaser.GameObjects.Graphics;
  private readonly pieceLayer: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly streak: Phaser.GameObjects.Image;
  private readonly edgeLeft: Phaser.GameObjects.Image;
  private readonly edgeRight: Phaser.GameObjects.Image;
  private readonly unsubscribe: Array<() => void>;
  private readonly textureKeys = new Set<string>();
  /** Sampled text pixels per label and size, so the text is only read once. */
  private readonly sampled = new Map<string, Array<[number, number]>>();

  private owner: Owner;
  private run?: Run;
  private elapsed = 0;
  private crack: Point[] = [];
  private cx = 0;
  private riftY = 0;
  private halfWidth = 0;
  private width = 0;
  private height = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.ambient = scene.add.graphics();
    this.scrim = scene.add.image(0, 0, this.gradient("scrim", 8, 256, "vertical", 0x050309));
    this.flare = scene.add.graphics();
    this.eye = scene.add.graphics();
    this.rules = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.pieceLayer = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const lit = TONES.you.line;
    this.streak = scene.add.image(0, 0, this.gradient("streak", 512, 16, "center", lit)).setBlendMode(Phaser.BlendModes.ADD);
    this.edgeLeft = scene.add.image(0, 0, this.gradient("edge", 160, 8, "left", lit)).setBlendMode(Phaser.BlendModes.ADD).setOrigin(0, 0);
    this.edgeRight = scene.add.image(0, 0, this.gradient("edge", 160, 8, "left", lit)).setBlendMode(Phaser.BlendModes.ADD).setOrigin(1, 0).setFlipX(true);
    this.label = scene.add.text(0, 0, "", { fontStyle: "700" }).setOrigin(0.5, 1);
    const resolution = Math.min(3, (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1) * 1.5);
    this.label.setResolution(resolution);
    this.all().forEach((o) => o.setDepth(DEPTH));
    // The crack's glow lies under the cards (which start at depth 10), never over one.
    [this.ambient, this.flare].forEach((o) => o.setDepth(GLOW_DEPTH));
    this.hideBanner();

    // Phaser starts after React has reported the first turn, so pick up the last report first.
    this.owner = arenaEventAdapter.latest("TURN_OWNER");
    this.unsubscribe = [
      arenaEventAdapter.on("TURN_OWNER", (owner) => (this.owner = owner)),
      arenaEventAdapter.on("TURN_BANNER", (banner) => this.play(banner))
    ];
  }

  private all() {
    return [this.ambient, this.scrim, this.flare, this.eye, this.rules, this.pieceLayer, this.streak, this.edgeLeft, this.edgeRight, this.label];
  }

  /**
   * A gradient strip in one colour, fading to clear: bright in the middle, at the left edge, or a soft
   * horizontal band. The colour is baked in (a texture per tone), because the Canvas renderer ignores tints.
   */
  private gradient(name: string, w: number, h: number, kind: "center" | "left" | "vertical", color: number) {
    const key = `turn-banner-${name}-${color.toString(16)}`;
    this.textureKeys.add(key);
    if (!this.scene.textures.exists(key)) {
      const rgb = `${(color >> 16) & 255},${(color >> 8) & 255},${color & 255}`;
      const { texture, ctx } = acquireCanvasTexture(this.scene, key, w, h);
      const g = kind === "vertical" ? ctx.createLinearGradient(0, 0, 0, h) : ctx.createLinearGradient(0, 0, w, 0);
      if (kind === "left") {
        g.addColorStop(0, `rgba(${rgb},1)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
      } else {
        g.addColorStop(0, `rgba(${rgb},0)`);
        g.addColorStop(0.5, `rgba(${rgb},1)`);
        g.addColorStop(1, `rgba(${rgb},0)`);
      }
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      texture.refresh();
    }
    return key;
  }

  /** Where the rift is, from the shared projection; the glow follows the same crack the table paints. */
  layout(proj: ArenaProjection) {
    const left = proj.project(0.5, -1.04).x;
    const right = proj.project(0.5, 1.04).x;
    this.crack = riftPolyline(proj);
    this.cx = proj.cx;
    this.riftY = proj.riftY;
    this.halfWidth = (right - left) / 2;
    this.width = proj.width;
    this.height = proj.height;
  }

  private hideBanner() {
    [this.scrim, this.flare, this.eye, this.rules, this.pieceLayer, this.streak, this.edgeLeft, this.edgeRight, this.label].forEach((o) => o.setVisible(false));
    [this.flare, this.eye, this.rules, this.pieceLayer].forEach((g) => g.clear());
  }

  private reduced() {
    return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }

  private fontSize() {
    return Math.round(Math.max(44, Math.min(84, this.height * 0.075)));
  }

  /** The text rests just above the rift. */
  private restY() {
    return this.riftY - this.fontSize() * 0.35;
  }

  private play(banner: Banner) {
    if (!this.scene.sys?.isActive() || this.width === 0) return;
    const tone = TONES[banner.owner];
    const full = banner.mode === "full";
    const size = this.fontSize();
    this.label
      .setFontFamily(fontFamily("--font-rajdhani", "Rajdhani, Arial Narrow, sans-serif"))
      .setFontSize(`${size}px`)
      .setLetterSpacing(size * 0.22)
      .setColor(tone.text)
      .setText(tone.label)
      .setShadow(0, 0, tone.glow, 24, false, true)
      .setPosition(this.cx, this.restY())
      .setScale(1);
    this.streak.setTexture(this.gradient("streak", 512, 16, "center", tone.line));
    const edge = this.gradient("edge", 160, 8, "left", tone.line);
    this.edgeLeft.setTexture(edge);
    this.edgeRight.setTexture(edge);
    this.run = {
      banner,
      t: 0,
      duration: full ? BANNER.FULL_MS : BANNER.FLASH_MS,
      pieces: full && !this.reduced() ? this.makePieces(banner) : []
    };
  }

  /**
   * The crystal pieces of the text: one for each sampled pixel of the label, which fly in from the
   * rims and the crack (starting in the middle of the text and weaving outwards) and break up again.
   */
  private makePieces(banner: Banner): Piece[] {
    const key = `${TONES[banner.owner].label}:${this.fontSize()}`;
    const canvas = this.label.canvas;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || canvas.width === 0 || this.label.width === 0) return [];

    const sx = this.label.width / canvas.width;
    const sy = this.label.height / canvas.height;
    let points = this.sampled.get(key);
    if (!points) {
      const step = Math.max(2, Math.round(SAMPLE_STEP_PX / sx));
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      points = sampleTargets(data, canvas.width, canvas.height, step, MAX_PIECES).map(
        ([px, py]) => [px * sx - this.label.width / 2, py * sy - this.label.height] as [number, number]
      );
      this.sampled.set(key, points);
    }

    const spread = Math.max(1, ...points.map(([dx]) => Math.abs(dx)));
    const gatherMs = BANNER.GATHER.ms - BANNER.PIECE_MS;
    return points.map(([dx, dy]) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      const fromRim = Math.random() < 0.6;
      const crackX = Phaser.Math.FloatBetween(-0.9, 0.9) * this.halfWidth;
      const angle = Phaser.Math.FloatBetween(-Math.PI, 0); // out and upwards
      const speed = Phaser.Math.FloatBetween(40, 140);
      return {
        dx,
        dy,
        fromX: fromRim ? side * this.halfWidth * Phaser.Math.FloatBetween(0.9, 1.1) : crackX,
        fromY: fromRim ? Phaser.Math.FloatBetween(-60, 60) : 0,
        delay: (Math.abs(dx) / spread) * gatherMs,
        outX: Math.cos(angle) * speed,
        outY: Math.sin(angle) * speed
      };
    });
  }

  /** The crack as a path, limited to `reach` (0..1) of its half width from the middle. */
  private strokeCrack(g: Phaser.GameObjects.Graphics, reach: number) {
    const limit = this.halfWidth * reach;
    const points = this.crack.filter((p) => Math.abs(p.x - this.cx) <= limit);
    if (points.length < 2) return;
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => g.lineTo(p.x, p.y));
    g.strokePath();
  }

  tick(delta: number) {
    this.elapsed += delta;
    this.drawAmbient();

    const run = this.run;
    if (!run) return;
    run.t += delta;
    if (run.t >= run.duration) {
      this.run = undefined;
      this.hideBanner();
      return;
    }
    this.drawBanner(run);
  }

  /** The glow over the crack for whoever acts, breathing like the turn frame of the rail. */
  private drawAmbient() {
    const g = this.ambient;
    g.clear();
    if (!this.owner || this.crack.length === 0) {
      g.setVisible(false);
      return;
    }
    g.setVisible(true);
    const tone = TONES[this.owner].line;
    const breath = this.reduced() ? 0.9 : 0.8 + 0.2 * Math.sin((this.elapsed / BREATH_MS) * Math.PI * 2);
    [
      { w: 16, a: 0.08 },
      { w: 7, a: 0.2 },
      { w: 2.4, a: 0.55 }
    ].forEach(({ w, a }) => {
      g.lineStyle(w, tone, a * breath);
      this.strokeCrack(g, 1.02);
    });
  }

  private drawBanner(run: Run) {
    const { banner, t, duration } = run;
    const tone = TONES[banner.owner];
    const full = banner.mode === "full";
    const reduced = this.reduced();
    const out = clamp01((t - BANNER.OUT_FROM) / (duration - BANNER.OUT_FROM));
    const fade = full ? 1 - out : 1 - clamp01(t / duration);

    // The glow flares along the crack, growing out from the middle.
    this.flare.clear();
    this.flare.setVisible(!reduced);
    if (!reduced) {
      const reach = easeOutCubic(phaseProgress(t, BANNER.FLARE.from, BANNER.FLARE.ms));
      [
        { w: 26, a: 0.14 },
        { w: 12, a: 0.35 },
        { w: 5, a: 0.9 }
      ].forEach(({ w, a }) => {
        this.flare.lineStyle(w, tone.line, a * fade);
        this.strokeCrack(this.flare, reach);
      });
    }

    this.label.setVisible(full);
    this.scrim.setVisible(full);
    [this.eye, this.rules, this.pieceLayer].forEach((g) => g.setVisible(full && !reduced));
    this.streak.setVisible(full && !reduced);
    this.edgeLeft.setVisible(full && !reduced);
    this.edgeRight.setVisible(full && !reduced);
    if (!full) return;

    const size = this.fontSize();
    const restY = this.restY();
    const bandIn = easeOutCubic(phaseProgress(t, BANNER.GATHER.from + 20, 260));
    const textIn = phaseProgress(t, BANNER.TEXT_IN.from, BANNER.TEXT_IN.ms);
    const breakUp = clamp01((t - BANNER.OUT_FROM) / 140);
    const band = reduced ? clamp01(t / 250) * clamp01((duration - t) / 250) : bandIn * (1 - out);
    const textAlpha = reduced ? band : textIn * (1 - breakUp);

    this.label.setPosition(this.cx, restY).setScale(1).setAlpha(textAlpha);
    this.scrim
      .setPosition(this.cx, restY - size * 0.5)
      .setDisplaySize(this.halfWidth * 2.1, size * 2.8)
      .setAlpha(0.85 * band);
    if (reduced) return;

    this.drawEye(banner, t);
    this.drawPieces(run, tone.line, restY);

    // Hairlines either side of the text, once it is there.
    const lineY = restY - size * 0.5;
    const gap = this.label.displayWidth / 2 + 20;
    const length = Math.min(this.halfWidth * 0.45, 240) * textIn;
    this.rules.clear();
    this.rules.lineStyle(2, tone.line, 0.85 * textAlpha);
    this.rules.lineBetween(this.cx - gap - length, lineY, this.cx - gap, lineY);
    this.rules.lineBetween(this.cx + gap, lineY, this.cx + gap + length, lineY);

    // A light sweep crosses the table once.
    const sweep = phaseProgress(t, BANNER.SWEEP.from, BANNER.SWEEP.ms);
    this.streak.setPosition(this.cx - this.halfWidth + this.halfWidth * 2 * sweep, this.riftY);
    this.streak.setDisplaySize(Math.max(180, this.halfWidth * 0.6), 14);
    this.streak.setAlpha(sweep > 0 && sweep < 1 ? Math.sin(sweep * Math.PI) * 0.75 : 0);

    // The screen edges glow with the tone of the turn.
    const edge = Math.sin(clamp01(t / duration) * Math.PI) * 0.24;
    const edgeWidth = Math.min(220, this.width * 0.12);
    this.edgeLeft.setPosition(0, 0).setDisplaySize(edgeWidth, this.height).setAlpha(edge);
    this.edgeRight.setPosition(this.width, 0).setDisplaySize(edgeWidth, this.height).setAlpha(edge);
  }

  /**
   * The eye of the rift: an almond that opens on the crack, dark inside, rimmed in the tone of the
   * turn, with an iris and a pupil that looks towards whoever acts. The opponent's pupil is a thin
   * vertical slit, yours a diamond.
   */
  private drawEye(banner: Banner, t: number) {
    const g = this.eye;
    g.clear();
    const open =
      easeOutCubic(phaseProgress(t, BANNER.EYE_OPEN.from, BANNER.EYE_OPEN.ms)) *
      (1 - phaseProgress(t, BANNER.EYE_CLOSE.from, BANNER.EYE_CLOSE.ms));
    if (open < 0.02) return;

    const tone = TONES[banner.owner].line;
    const a = this.halfWidth * 0.15;
    const b = a * 0.5;
    const lens = lensPoints(a, b, open);
    const trace = () => {
      g.beginPath();
      lens.forEach((p, i) => (i === 0 ? g.moveTo(this.cx + p.x, this.riftY + p.y) : g.lineTo(this.cx + p.x, this.riftY + p.y)));
      g.closePath();
    };

    // The eye covers the crack beneath it, then its rim glows.
    g.fillStyle(0x07040f, 0.94);
    trace();
    g.fillPath();
    [
      { w: 9, al: 0.18 },
      { w: 4, al: 0.5 },
      { w: 1.6, al: 1 }
    ].forEach(({ w, al }) => {
      g.lineStyle(w, tone, al);
      trace();
      g.strokePath();
    });

    // Iris and pupil, looking towards the half of whoever acts.
    const cy = this.riftY + actorDirection(banner.owner) * b * 0.2 * open;
    const ir = b * 0.8 * open;
    g.lineStyle(1.4, tone, 0.7);
    g.strokeCircle(this.cx, cy, ir);
    g.fillStyle(tone, 0.12);
    g.fillCircle(this.cx, cy, ir);
    const hh = ir * 0.9;
    const hw = banner.owner === "you" ? hh * 0.7 : hh * 0.14;
    g.fillStyle(tone, 0.95);
    g.beginPath();
    g.moveTo(this.cx, cy - hh);
    g.lineTo(this.cx + hw, cy);
    g.lineTo(this.cx, cy + hh);
    g.lineTo(this.cx - hw, cy);
    g.closePath();
    g.fillPath();
  }

  /** The text's crystal pieces: flying in while it gathers, flying out as it breaks up. */
  private drawPieces(run: Run, color: number, restY: number) {
    const g = this.pieceLayer;
    g.clear();
    const { t, pieces } = run;
    if (pieces.length === 0) return;

    const gather = t < BANNER.OUT_FROM;
    const gone = 1 - phaseProgress(t, BANNER.TEXT_IN.from, BANNER.TEXT_IN.ms);
    const breakUp = clamp01((t - BANNER.OUT_FROM) / (BANNER.FULL_MS - BANNER.OUT_FROM));
    if (gather && gone <= 0) return;

    pieces.forEach((p) => {
      const tx = this.cx + p.dx;
      const ty = restY + p.dy;
      let x: number;
      let y: number;
      let alpha: number;
      if (gather) {
        const local = clamp01((t - BANNER.GATHER.from - p.delay) / BANNER.PIECE_MS);
        if (local <= 0) return;
        const e = easeOutCubic(local);
        x = this.cx + p.fromX + (tx - this.cx - p.fromX) * e;
        y = this.riftY + p.fromY + (ty - this.riftY - p.fromY) * e - Math.sin(Math.PI * local) * 24;
        alpha = Math.min(1, local * 3) * gone;
      } else {
        x = tx + p.outX * breakUp;
        y = ty + p.outY * breakUp;
        alpha = 1 - breakUp;
      }
      const r = 1.6 + 1.4 * (gather ? 1 - gone : 1 - breakUp);
      g.fillStyle(color, 0.9 * alpha);
      g.beginPath();
      g.moveTo(x, y - r);
      g.lineTo(x + r, y);
      g.lineTo(x, y + r);
      g.lineTo(x - r, y);
      g.closePath();
      g.fillPath();
    });
  }

  destroy() {
    this.unsubscribe.forEach((off) => off());
    this.all().forEach((o) => o.destroy());
    this.textureKeys.forEach((key) => {
      if (this.scene.textures?.exists(key)) this.scene.textures.remove(key);
    });
    this.textureKeys.clear();
    this.sampled.clear();
  }
}
