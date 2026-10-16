import * as Phaser from "phaser";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { fitSealText, passSealStyle, sealPlacement, type PassSealStyle } from "../../hud/passButton/passSeal";
import type { ArenaEventMap } from "../../../../libs/arenaEventBus";
import { logicalSize } from "../config/arenaScale";
import { acquireCanvasTexture } from "./canvasTexture";
import { fontFamily } from "./cardFace";

type SealPayload = NonNullable<ArenaEventMap["PASS_SEAL"]>;

/** Texture size and the ring radius it is drawn with (px); the rest is room for the glow. */
const SIZE = 320;
const R = 110;
const CENTER = SIZE / 2;
const DEPTH = 9000;

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex: string, alpha: number) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
};

/**
 * The pass / attack / defend seal, drawn on the arena canvas: a dark disc with a ring of dashes,
 * a flat diamond above the label, and a sub-label under it. The DOM button underneath keeps the
 * click, the focus and the rules (`getSmartAction`); this only paints what it reports through the
 * `PASS_SEAL` event. Layers, back to front: glow, body, dash ring, orbiting highlight, texts.
 *
 * The textures are painted once per tone (a state change swaps them); the motion — dash spin,
 * orbit, the beat that follows the clock, hover lift — runs from the scene's update loop.
 */
export class PassSealRenderer {
  private readonly view: Phaser.GameObjects.Container;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly body: Phaser.GameObjects.Image;
  private readonly dash: Phaser.GameObjects.Image;
  private readonly orbit: Phaser.GameObjects.Image;
  private readonly label: Phaser.GameObjects.Text;
  private readonly sub: Phaser.GameObjects.Text;
  private readonly textureKeys = new Set<string>();
  private readonly unsubscribe: () => void;

  private payload?: SealPayload;
  private style?: PassSealStyle;
  private radius = 0;
  private scaleNow = 1;
  private alphaNow = 0;
  private lastRect = "";
  private lastLook = "";

  constructor(private readonly scene: Phaser.Scene) {
    this.glow = scene.add.image(0, 0, "__DEFAULT").setBlendMode(Phaser.BlendModes.ADD);
    this.body = scene.add.image(0, 0, "__DEFAULT");
    this.dash = scene.add.image(0, 0, "__DEFAULT");
    this.orbit = scene.add.image(0, 0, "__DEFAULT").setBlendMode(Phaser.BlendModes.ADD);
    this.label = scene.add.text(0, 0, "", { fontStyle: "700" }).setOrigin(0.5);
    this.sub = scene.add.text(0, 0, "", { fontStyle: "600" }).setOrigin(0.5);
    const resolution = Math.min(3, (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1) * 1.5);
    this.label.setResolution(resolution);
    this.sub.setResolution(resolution);
    this.view = scene.add
      .container(0, 0, [this.glow, this.body, this.dash, this.orbit, this.label, this.sub])
      .setDepth(DEPTH)
      .setVisible(false);

    // Phaser starts after React has already reported the seal, so pick up the last report first.
    this.unsubscribe = arenaEventAdapter.on("PASS_SEAL", (payload) => this.setState(payload));
    this.setState(arenaEventAdapter.latest("PASS_SEAL"));
  }

  setState(payload: ArenaEventMap["PASS_SEAL"]) {
    this.payload = payload;
    if (!payload) {
      this.view.setVisible(false);
      return;
    }
    this.style = this.calmed(passSealStyle(payload));
    this.place();
    this.paint();
  }

  /** `prefers-reduced-motion`: the colours and the lit orbit stay, the beat and the spin go. */
  private calmed(style: PassSealStyle): PassSealStyle {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    return reduce ? { ...style, pulse: 0, spin: 0 } : style;
  }

  /** Re-places the seal; also called when the canvas is resized. */
  place() {
    const payload = this.payload;
    if (!payload || !this.scene.sys?.isActive()) return;
    const canvas = this.scene.game.canvas;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    const placed = sealPlacement(
      payload.rect,
      { x: box.left, y: box.top, width: box.width, height: box.height },
      logicalSize(this.scene.scale)
    );
    if (placed.radius < 8) {
      this.view.setVisible(false);
      return;
    }
    this.radius = placed.radius;
    this.view.setPosition(placed.x, placed.y).setVisible(true);

    const rectKey = `${Math.round(placed.radius * 10)}`;
    if (rectKey !== this.lastRect) {
      this.lastRect = rectKey;
      const k = placed.radius / R;
      [this.glow, this.body, this.dash, this.orbit].forEach((image) => image.setScale(k));
      this.layoutTexts();
    }
  }

  private layoutTexts() {
    const r = this.radius;
    this.label.setFontSize(`${Math.round(r * 0.4)}px`).setPosition(0, r * 0.24).setLetterSpacing(r * 0.04);
    this.sub.setFontSize(`${Math.max(8, Math.round(r * 0.14))}px`).setPosition(0, r * 0.58).setLetterSpacing(r * 0.03);
  }

  /** Swaps the textures and the texts when the look of the seal changed. */
  private paint() {
    const payload = this.payload;
    const style = this.style;
    if (!payload || !style) return;

    const display = fontFamily("--font-rajdhani", "Rajdhani, Arial Narrow, sans-serif");
    const mono = fontFamily("--font-geist-mono", "ui-monospace, monospace");
    const sublabel = fitSealText(payload.sublabel, 12).toUpperCase();

    const look = `${style.tone}|${style.text}|${payload.label}|${sublabel}`;
    if (look === this.lastLook) return;
    this.lastLook = look;

    this.glow.setTexture(this.texture(`glow-${style.tone}`, (ctx) => this.drawGlow(ctx, style.tone)));
    this.body.setTexture(this.texture(`body-${style.tone}-${style.text}`, (ctx) => this.drawBody(ctx, style)));
    this.dash.setTexture(this.texture(`dash-${style.tone}`, (ctx) => this.drawDash(ctx, style.tone)));
    this.orbit.setTexture(this.texture(`orbit-${style.tone}`, (ctx) => this.drawOrbit(ctx, style.tone)));

    this.label.setFontFamily(display).setColor(style.text).setText(payload.label.toUpperCase());
    this.sub
      .setFontFamily(mono)
      .setColor(rgba(style.text, 0.62))
      .setText(sublabel);
    this.layoutTexts();
  }

  private texture(name: string, draw: (ctx: CanvasRenderingContext2D) => void) {
    const key = `pass-seal-${name}`;
    // Painted once per tone: acquiring an existing texture would clear it.
    if (!this.scene.textures.exists(key)) {
      const { texture, ctx } = acquireCanvasTexture(this.scene, key, SIZE, SIZE);
      draw(ctx);
      texture.refresh();
    }
    this.textureKeys.add(key);
    return key;
  }

  private drawGlow(ctx: CanvasRenderingContext2D, tone: string) {
    const gradient = ctx.createRadialGradient(CENTER, CENTER, R * 0.7, CENTER, CENTER, R * 1.42);
    gradient.addColorStop(0, rgba(tone, 0.55));
    gradient.addColorStop(0.45, rgba(tone, 0.16));
    gradient.addColorStop(1, rgba(tone, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, SIZE, SIZE);
  }

  private drawBody(ctx: CanvasRenderingContext2D, style: PassSealStyle) {
    const { tone, text } = style;
    // The disc: obsidian, a little lighter towards the top like the table's lit rim.
    const disc = ctx.createRadialGradient(CENTER, CENTER - R * 0.35, R * 0.1, CENTER, CENTER, R);
    disc.addColorStop(0, "rgba(34,20,66,0.96)");
    disc.addColorStop(1, "rgba(7,4,15,0.97)");
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, R, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    // A rim of the state's tone, plus a faint inner line.
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(tone, 0.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, R * 0.9, 0, Math.PI * 2);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgba(tone, 0.2);
    ctx.stroke();

    // The flat diamond above the label: an outline with a smaller one inside, as in the mock-up.
    const cy = CENTER - R * 0.36;
    const rhombus = (hw: number, hh: number) => {
      ctx.beginPath();
      ctx.moveTo(CENTER, cy - hh);
      ctx.lineTo(CENTER + hw, cy);
      ctx.lineTo(CENTER, cy + hh);
      ctx.lineTo(CENTER - hw, cy);
      ctx.closePath();
    };
    rhombus(R * 0.36, R * 0.18);
    ctx.fillStyle = rgba(tone, 0.1);
    ctx.fill();
    ctx.lineJoin = "round";
    ctx.lineWidth = 3;
    ctx.strokeStyle = rgba(text, 0.9);
    ctx.stroke();
    rhombus(R * 0.17, R * 0.085);
    ctx.lineWidth = 2;
    ctx.strokeStyle = rgba(tone, 0.85);
    ctx.stroke();
  }

  /** The ring of short dashes that turns slowly around the disc, with a dot at each quarter. */
  private drawDash(ctx: CanvasRenderingContext2D, tone: string) {
    const radius = R * 1.1;
    const count = 64;
    const step = (Math.PI * 2) / count;
    ctx.lineCap = "butt";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = rgba(tone, 0.8);
    for (let i = 0; i < count; i += 1) {
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, radius, i * step, i * step + step * 0.55);
      ctx.stroke();
    }
    ctx.fillStyle = rgba(tone, 1);
    for (let i = 0; i < 4; i += 1) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(CENTER + Math.cos(a) * radius, CENTER + Math.sin(a) * radius, 3.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** A bright arc with a fading tail, to be rotated around the rim. */
  private drawOrbit(ctx: CanvasRenderingContext2D, tone: string) {
    const segments = 28;
    const sweep = (Math.PI * 2) / 4.2;
    ctx.lineCap = "round";
    for (let i = 0; i < segments; i += 1) {
      const t = i / segments;
      ctx.beginPath();
      ctx.arc(CENTER, CENTER, R * 1.0, -sweep + t * sweep, -sweep + ((i + 1.4) / segments) * sweep);
      ctx.lineWidth = 3 + t * 4;
      ctx.strokeStyle = rgba(tone, t * t);
      ctx.stroke();
    }
  }

  private reduced() {
    return typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  }

  /** Motion, once per frame. */
  tick(delta: number) {
    const style = this.style;
    if (!this.payload || !style || !this.view.visible) return;

    const seconds = delta / 1000;
    this.dash.angle += style.spin * seconds;
    if (!this.reduced()) this.orbit.angle += 150 * seconds;
    this.orbit.setVisible(style.orbit);

    // One beat per second, in step with the clock: a hard rise that decays.
    const beat = style.pulse > 0 ? Math.pow(1 - ((Date.now() % 1000) / 1000), 3) : 0;
    const targetScale = style.scale * (1 + style.pulse * beat * 2);
    const ease = 1 - Math.pow(0.0001, seconds);
    this.scaleNow += (targetScale - this.scaleNow) * ease;
    this.alphaNow += (style.alpha - this.alphaNow) * ease;

    this.view.setScale(this.scaleNow).setAlpha(this.alphaNow);
    this.glow.setAlpha(Math.min(1, style.glow * (0.75 + (style.pulse > 0 ? beat * 1.2 : 0.25 * Math.sin(Date.now() / 700)))));
  }

  destroy() {
    this.unsubscribe();
    this.view.destroy();
    this.textureKeys.forEach((key) => {
      if (this.scene.textures?.exists(key)) this.scene.textures.remove(key);
    });
    this.textureKeys.clear();
  }
}
