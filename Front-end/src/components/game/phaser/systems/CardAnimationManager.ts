import Phaser from "phaser";
import type { UnitView } from "../types/arenaTypes";
import { getEffectColor, type SpellEffectKind } from "../../visualEffectSemantics";

/** Lightweight procedural fallback for cards without Spine/spritesheet assets. */
export class CardAnimationManager {
  private readonly tweens = new Map<string, Phaser.Tweens.Tween[]>();

  constructor(private readonly scene: Phaser.Scene) {}

  attach(card: UnitView, isChampion: boolean, color: number, isTargetable = false, targetType?: "ally" | "enemy", hasBarrier = false) {
    if (!card.unitId) return;
    const width = card.width || 100;
    const height = card.height || 140;

    const cardTween = this.scene.tweens.add({
      targets: card,
      scaleX: { from: 1, to: isChampion ? 1.025 : 1.012 },
      scaleY: { from: 1, to: isChampion ? 1.025 : 1.012 },
      duration: isChampion ? 1650 : 2100,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });

    const cardTweens = [cardTween];
    if (isChampion) {
      // Champions no longer use a rotating border or orbital ribbons. Their
      // identity is carried by short, irregular yellow electricity flashes
      // that blink around the silhouette without obscuring the artwork.
      cardTweens.push(...this.createChampionElectricity(card, width, height));
    } else {
      const aura = this.scene.add.graphics();
      aura.lineStyle(1, color, 0.08);
      aura.strokeRoundedRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, Math.min(16, width * 0.12));
      aura.setBlendMode(Phaser.BlendModes.ADD);
      card.addAt(aura, 0);
      cardTweens.push(this.scene.tweens.add({
        targets: aura,
        alpha: { from: 0.18, to: 0.48 },
        duration: 1900,
        ease: "Sine.InOut",
        yoyo: true,
        repeat: -1,
      }));
    }
    if (hasBarrier) {
      cardTweens.push(...this.createBarrierGlow(card, width, height));
    }
    if (isTargetable) {
      cardTweens.push(...this.createTargetingHighlight(card, width, height, targetType));
    }
    this.tweens.set(card.unitId, cardTweens);
  }

  private createBarrierGlow(card: UnitView, width: number, height: number) {
    const skyBlue = 0x38bdf8;
    const whiteCyan = 0xf0f9ff;

    const glow = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    // Outer sky-blue soft glow
    glow.lineStyle(3.2, skyBlue, 0.92);
    glow.strokeRoundedRect(-width / 2 - 7, -height / 2 - 7, width + 14, height + 14, Math.min(19, width * 0.15));
    // Inner crisp white-cyan core line
    glow.lineStyle(1.6, whiteCyan, 0.98);
    glow.strokeRoundedRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, Math.min(16, width * 0.12));
    card.addAt(glow, 0);

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

  private createTargetingHighlight(card: UnitView, width: number, height: number, targetType?: "ally" | "enemy") {
    const isEnemy = targetType === "enemy";
    const mainColor = isEnemy ? 0xef4444 : 0x22c55e; // Fiery Crimson Red for Enemy, Bright Emerald Green for Ally
    const innerColor = isEnemy ? 0xfca5a5 : 0x86efac;

    const highlight = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    highlight.lineStyle(3.5, mainColor, 0.98);
    highlight.strokeRoundedRect(-width / 2 - 7, -height / 2 - 7, width + 14, height + 14, Math.min(19, width * 0.15));
    highlight.lineStyle(1.4, innerColor, 0.95);
    highlight.strokeRoundedRect(-width / 2 - 3, -height / 2 - 3, width + 6, height + 6, Math.min(16, width * 0.12));
    card.addAt(highlight, 0);

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

  private createChampionElectricity(card: UnitView, width: number, height: number) {
    const tweens: Phaser.Tweens.Tween[] = [];
    const bolts = [
      { side: "top", offset: -0.28 }, { side: "top", offset: 0.24 },
      { side: "right", offset: -0.24 }, { side: "right", offset: 0.28 },
      { side: "bottom", offset: -0.22 }, { side: "bottom", offset: 0.3 },
      { side: "left", offset: -0.27 }, { side: "left", offset: 0.2 },
    ] as const;

    bolts.forEach(({ side, offset }, index) => {
      const bolt = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
      this.drawBolt(bolt, side, offset, width, height);
      card.add(bolt);
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
    width: number,
    height: number,
  ) {
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    const anchorX = side === "top" || side === "bottom" ? offset * width : side === "right" ? halfWidth : -halfWidth;
    const anchorY = side === "left" || side === "right" ? offset * height : side === "bottom" ? halfHeight : -halfHeight;
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

  playBarrierTrigger(card: UnitView) {
    const width = card.width || 100;
    const height = card.height || 140;
    const flash = this.scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    flash.lineStyle(4, 0x38bdf8, 1);
    flash.strokeRoundedRect(-width / 2 - 8, -height / 2 - 8, width + 16, height + 16, Math.min(20, width * 0.16));
    flash.lineStyle(2, 0xffffff, 1);
    flash.strokeRoundedRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8, Math.min(17, width * 0.13));
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
    const width = card.width || 100;
    const height = card.height || 140;
    const pulse = this.scene.add.graphics();
    pulse.lineStyle(kind === "explosion" ? 3 : 2, color, 0.95);
    pulse.strokeRoundedRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, Math.min(18, width * 0.14));
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
  }
}
