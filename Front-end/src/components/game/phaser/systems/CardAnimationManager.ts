import * as Phaser from "phaser";
import type { UnitView } from "../types/arenaTypes";
import { getEffectColor, type SpellEffectKind } from "../../visualEffectSemantics";

type Outline = Array<{ x: number; y: number }>;
/** Redraws one glow layer for the card's current outline. */
type Redraw = (outline: Outline) => void;

/** Lightweight procedural fallback for cards without Spine/spritesheet assets. */
export class CardAnimationManager {
  private readonly tweens = new Map<string, Phaser.Tweens.Tween[]>();
  private readonly layers = new Map<string, Redraw[]>();

  constructor(private readonly scene: Phaser.Scene) {}

  attach(card: UnitView, isChampion: boolean, color: number, isTargetable = false, targetType?: "ally" | "enemy", hasBarrier = false) {
    if (!card.unitId) return;
    const redraws: Redraw[] = [];

    // Only champions breathe: rescaling the face texture every frame blurs the small
    // ATK / HP numbers on ordinary units.
    const cardTweens: Phaser.Tweens.Tween[] = isChampion
      ? [this.scene.tweens.add({
          targets: card,
          scaleX: { from: 1, to: 1.025 },
          scaleY: { from: 1, to: 1.025 },
          duration: 1650,
          ease: "Sine.InOut",
          yoyo: true,
          repeat: -1,
        })]
      : [];
    if (isChampion) {
      // Champions no longer use a rotating border or orbital ribbons. Their
      // identity is carried by short, irregular yellow electricity flashes
      // that blink around the silhouette without obscuring the artwork.
      cardTweens.push(...this.createChampionElectricity(card, redraws));
    } else {
      cardTweens.push(this.createAura(card, color, redraws));
    }
    if (hasBarrier) {
      cardTweens.push(...this.createBarrierGlow(card, redraws));
    }
    if (isTargetable) {
      cardTweens.push(...this.createTargetingHighlight(card, redraws, targetType));
    }
    this.tweens.set(card.unitId, cardTweens);
    this.layers.set(card.unitId, redraws);
    this.setOutline(card, this.outlineOf(card));
  }

  /**
   * Moves every glow layer onto a new silhouette, e.g. when the card stands up.
   * The outline is relative to the card's centre.
   */
  setOutline(card: UnitView, outline: Outline) {
    card.setData("outline", outline);
    if (card.unitId) this.layers.get(card.unitId)?.forEach((redraw) => redraw(outline));
  }

  private createAura(card: UnitView, color: number, redraws: Redraw[]) {
    const aura = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    card.addAt(aura, 0);
    redraws.push((outline) => {
      aura.clear();
      aura.lineStyle(1, color, 0.08);
      this.strokeOutline(aura, outline, 3);
    });
    return this.scene.tweens.add({
      targets: aura,
      alpha: { from: 0.18, to: 0.48 },
      duration: 1900,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
  }

  private createBarrierGlow(card: UnitView, redraws: Redraw[]) {
    const skyBlue = 0x38bdf8;
    const whiteCyan = 0xf0f9ff;

    const glow = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    card.addAt(glow, 0);
    redraws.push((outline) => {
      glow.clear();
      // Outer sky-blue soft glow
      glow.lineStyle(3.2, skyBlue, 0.92);
      this.strokeOutline(glow, outline, 7);
      // Inner crisp white-cyan core line
      glow.lineStyle(1.6, whiteCyan, 0.98);
      this.strokeOutline(glow, outline, 3);
    });

    return [this.scene.tweens.add({
      targets: glow,
      alpha: { from: 0.45, to: 1 },
      scaleX: { from: 0.985, to: 1.035 },
      scaleY: { from: 0.985, to: 1.035 },
      duration: 750,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    })];
  }

  private createTargetingHighlight(card: UnitView, redraws: Redraw[], targetType?: "ally" | "enemy") {
    const isEnemy = targetType === "enemy";
    const mainColor = isEnemy ? 0xef4444 : 0x22c55e; // Fiery Crimson Red for Enemy, Bright Emerald Green for Ally
    const innerColor = isEnemy ? 0xfca5a5 : 0x86efac;

    const highlight = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    card.addAt(highlight, 0);
    redraws.push((outline) => {
      highlight.clear();
      highlight.lineStyle(3.5, mainColor, 0.98);
      this.strokeOutline(highlight, outline, 7);
      highlight.lineStyle(1.4, innerColor, 0.95);
      this.strokeOutline(highlight, outline, 3);
    });

    return [this.scene.tweens.add({
      targets: highlight,
      alpha: { from: 0.45, to: 1 },
      scaleX: { from: 0.982, to: 1.038 },
      scaleY: { from: 0.982, to: 1.038 },
      duration: 600,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    })];
  }

  private createChampionElectricity(card: UnitView, redraws: Redraw[]) {
    const tweens: Phaser.Tweens.Tween[] = [];
    const bolts = [
      { side: "top", offset: -0.28 }, { side: "top", offset: 0.24 },
      { side: "right", offset: -0.24 }, { side: "right", offset: 0.28 },
      { side: "bottom", offset: -0.22 }, { side: "bottom", offset: 0.3 },
      { side: "left", offset: -0.27 }, { side: "left", offset: 0.2 },
    ] as const;

    bolts.forEach(({ side, offset }, index) => {
      const bolt = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      card.add(bolt);
      redraws.push((outline) => {
        bolt.clear();
        this.drawBolt(bolt, side, offset, outline);
      });
      tweens.push(this.scene.tweens.add({
        targets: bolt,
        alpha: { from: 0.04, to: 1 },
        scaleX: { from: 0.94, to: 1.04 },
        scaleY: { from: 0.94, to: 1.04 },
        duration: 210 + (index % 3) * 70,
        hold: 90 + (index % 2) * 80,
        delay: index * 135,
        ease: "Quad.Out",
        yoyo: true,
        repeat: -1,
      }));
    });
    return tweens;
  }

  private drawBolt(
    graphics: Phaser.GameObjects.Graphics,
    side: "top" | "right" | "bottom" | "left",
    offset: number,
    outline: Outline,
  ) {
    const xs = outline.map((p) => p.x);
    const ys = outline.map((p) => p.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    const width = right - left;
    const height = bottom - top;
    const centerX = (left + right) / 2;
    const centerY = (top + bottom) / 2;
    const anchorX = side === "top" || side === "bottom" ? centerX + offset * width : side === "right" ? right : left;
    const anchorY = side === "left" || side === "right" ? centerY + offset * height : side === "bottom" ? bottom : top;
    const direction = side === "top" ? [0, -1] : side === "right" ? [1, 0] : side === "bottom" ? [0, 1] : [-1, 0];
    const [dx, dy] = direction;
    const points = [
      [anchorX, anchorY],
      [anchorX + dx * 4 + (dy ? 4 : 0), anchorY + dy * 4 + (dx ? 4 : 0)],
      [anchorX + dx * 11 - (dy ? 5 : 0), anchorY + dy * 11 - (dx ? 5 : 0)],
      [anchorX + dx * 16 + (dy ? 2 : 0), anchorY + dy * 16 + (dx ? 2 : 0)],
      [anchorX + dx * 25, anchorY + dy * 25],
    ];

    graphics.lineStyle(5, 0xffc928, 0.2);
    graphics.beginPath();
    graphics.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => graphics.lineTo(x, y));
    graphics.strokePath();
    graphics.lineStyle(1.8, 0xffec8a, 0.98);
    graphics.beginPath();
    graphics.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => graphics.lineTo(x, y));
    graphics.strokePath();
  }

  /** The card's silhouette relative to its centre: the stored outline, else its rectangle. */
  private outlineOf(card: UnitView): Outline {
    const stored = card.getData("outline") as Outline | undefined;
    if (stored && stored.length >= 3) return stored;
    const halfWidth = (card.width || 100) / 2;
    const halfHeight = (card.height || 140) / 2;
    return [
      { x: -halfWidth, y: halfHeight },
      { x: halfWidth, y: halfHeight },
      { x: halfWidth, y: -halfHeight },
      { x: -halfWidth, y: -halfHeight },
    ];
  }

  /** Strokes the silhouette grown outwards by `pad` px. */
  private strokeOutline(graphics: Phaser.GameObjects.Graphics, outline: Outline, pad: number) {
    const cx = outline.reduce((sum, p) => sum + p.x, 0) / outline.length;
    const cy = outline.reduce((sum, p) => sum + p.y, 0) / outline.length;
    graphics.beginPath();
    outline.forEach((p, index) => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const len = Math.max(1, Math.hypot(dx, dy));
      const x = p.x + (dx / len) * pad;
      const y = p.y + (dy / len) * pad;
      if (index === 0) graphics.moveTo(x, y);
      else graphics.lineTo(x, y);
    });
    graphics.closePath();
    graphics.strokePath();
  }

  playBarrierTrigger(card: UnitView) {
    const outline = this.outlineOf(card);
    const flash = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    flash.lineStyle(4, 0x38bdf8, 1);
    this.strokeOutline(flash, outline, 8);
    flash.lineStyle(2, 0xffffff, 1);
    this.strokeOutline(flash, outline, 4);
    card.add(flash);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 550,
      ease: "Cubic.Out",
      onComplete: () => flash.destroy(),
    });

    this.scene.tweens.add({
      targets: card,
      angle: { from: -2.5, to: 2.5 },
      duration: 75,
      yoyo: true,
      repeat: 2,
      ease: "Sine.InOut",
      onComplete: () => card.setAngle(0),
    });
  }

  playEffect(card: UnitView, kind: SpellEffectKind) {
    const color = getEffectColor(kind);
    const pulse = this.scene.add.graphics();
    pulse.lineStyle(kind === "explosion" ? 3 : 2, color, 0.95);
    this.strokeOutline(pulse, this.outlineOf(card), 5);
    pulse.setBlendMode(Phaser.BlendModes.ADD);
    card.add(pulse);
    this.scene.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: kind === "explosion" ? 1.12 : 1.06,
      scaleY: kind === "explosion" ? 1.12 : 1.06,
      duration: kind === "explosion" ? 420 : 620,
      ease: "Cubic.Out",
      onComplete: () => pulse.destroy(),
    });
    this.scene.tweens.add({
      targets: card,
      angle: kind === "dark" ? -2 : 2,
      duration: 90,
      yoyo: true,
      repeat: 2,
      ease: "Sine.InOut",
      onComplete: () => card.setAngle(0),
    });
  }

  clear() {
    this.tweens.forEach((cardTweens) => cardTweens.forEach((tween) => tween.stop()));
    this.tweens.clear();
    this.layers.clear();
  }
}
