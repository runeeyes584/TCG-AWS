import Phaser from "phaser";
import type { VisualEvent } from "@backend/game/types";
import type { UnitView } from "../types/arenaTypes";
import { getEffectKind, getEffectTargetId, type SpellEffectKind } from "../../visualEffectSemantics";

/** Procedural combat feedback that works with both WebGL and Canvas fallback. */
export class CombatVFXSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolveCard: (unitId: string) => UnitView | undefined,
    private readonly playCardEffect: (unitId: string, kind: SpellEffectKind) => void,
  ) {}

  playVisualEvent(event: VisualEvent) {
    const kind = getEffectKind(event);
    if (!kind) return;
    const targetId = getEffectTargetId(event);

    if (event.type === "DAMAGE") {
      this.playDamage(this.nexusPlayerId(event.targetId), event.isNexus);
    }
    if (event.type === "HEAL" && event.isNexus) {
      this.playNexusImpact(this.nexusPlayerId(event.targetId), 0x4ade80, 0x22c55e, false);
    }
    if (event.type === "BANISH") {
      this.playBanish(event.playerId);
    }
    if (event.type === "GRAVEYARD_RESTORE") {
      this.playGraveyardRestore(event.playerId, event.mode);
    }

    if (!targetId || targetId.startsWith("nexus-")) return;
    if (targetId.startsWith("graveyard-")) return;
    const card = this.resolveCard(targetId);
    if (!card) return;
    this.playCardEffect(targetId, kind);
    if (kind !== "explosion") {
      this.playSparks(card.x, card.y, kind === "dark" ? 0x7c3aed : 0x22d3ee, 8, card.depth + 5);
    }
  }

  playBuffDebuff(unitId: string, type: "BUFF" | "DEBUFF") {
    const card = this.resolveCard(unitId);
    if (!card) return;
    const isBuff = type === "BUFF";
    const sparkColor = isBuff ? 0x22c55e : 0xef4444;

    const startX = card.x;
    this.scene.tweens.add({
      targets: card,
      x: { from: startX - 2.5, to: startX + 2.5 },
      duration: 45,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: 2,
      onComplete: () => card.setX(startX),
    });

    const ring = this.scene.add.circle(card.x, card.y, 16, sparkColor, 0.12)
      .setStrokeStyle(3, sparkColor, 0.95)
      .setDepth(card.depth + 4);

    this.scene.tweens.add({
      targets: ring,
      radius: Math.max(card.width, card.height) * 0.78,
      alpha: 0,
      duration: 650,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });

    this.playSparks(card.x, card.y, sparkColor, 18, card.depth + 5);
  }

  playAttack(unitId: string) {
    const card = this.resolveCard(unitId);
    if (!card) return;
    this.playImpact(card.x, card.y, 0xffc857, 0x8b5cf6, 0.012);
  }

  playSummon(unitId: string) {
    const card = this.resolveCard(unitId);
    if (!card) return;
    const ring = this.scene.add.circle(card.x, card.y, 14, 0xfbbf24, 0.06)
      .setStrokeStyle(2, 0xfbbf24, 0.9)
      .setDepth(card.depth + 3);
    this.scene.tweens.add({
      targets: ring,
      radius: Math.max(card.width, card.height) * 0.72,
      alpha: 0,
      duration: 480,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });
    this.playSparks(card.x, card.y, 0xfbbf24, 10, card.depth + 4);
  }

  playDamage(targetId: string, isNexus: boolean) {
    if (isNexus) {
      this.playNexusImpact(targetId, 0xfb7185, 0xef4444, true);
      return;
    }
    const card = isNexus ? undefined : this.resolveCard(targetId);
    const x = card?.x ?? this.scene.scale.width / 2;
    const y = card?.y ?? (targetId === "P1" ? this.scene.scale.height * 0.12 : this.scene.scale.height * 0.88);
    this.playImpact(x, y, 0xff5d73, 0xef4444, isNexus ? 0.025 : 0.009);
    if (card) {
      this.scene.tweens.add({
        targets: card,
        x: { from: card.x - 5, to: card.x + 5 },
        duration: 55,
        yoyo: true,
        repeat: 3,
        onComplete: () => card.setPosition(x, y),
      });
    }
  }

  private nexusPlayerId(targetId: string) {
    return targetId.startsWith("nexus-") ? targetId.slice("nexus-".length) : targetId;
  }

  private playNexusImpact(playerId: string, coreColor: number, edgeColor: number, damage: boolean) {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const x = width / 2;
    const y = playerId === "P1" ? height * 0.1 : height * 0.9;
    const depth = 1000;
    this.scene.cameras.main.shake(damage ? 360 : 220, damage ? 0.018 : 0.006);

    const sigil = this.scene.add.container(x, y).setDepth(depth);
    const outer = this.scene.add.circle(0, 0, damage ? 20 : 16, coreColor, 0.08)
      .setStrokeStyle(3, coreColor, 0.98);
    const inner = this.scene.add.circle(0, 0, 7, edgeColor, 0.22)
      .setStrokeStyle(1.5, edgeColor, 0.9);
    const ray = this.scene.add.graphics();
    ray.lineStyle(damage ? 4 : 2, edgeColor, 0.72);
    ray.lineBetween(-58, 0, 58, 0);
    ray.lineStyle(1, coreColor, 0.8);
    ray.lineBetween(-38, -8, 38, 8);
    ray.lineBetween(-38, 8, 38, -8);
    sigil.add([ray, outer, inner]);
    this.scene.tweens.add({
      targets: sigil,
      scale: damage ? 2.5 : 1.9,
      alpha: 0,
      angle: damage ? 18 : -18,
      duration: damage ? 620 : 760,
      ease: "Cubic.Out",
      onComplete: () => sigil.destroy(),
    });
    this.playSparks(x, y, edgeColor, damage ? 28 : 18, depth + 1);
  }

  private playBanish(playerId: string) {
    const x = this.scene.scale.width * 0.08;
    const y = playerId === "P1" ? this.scene.scale.height * 0.82 : this.scene.scale.height * 0.18;
    const vortex = this.scene.add.graphics().setDepth(1000);
    const phase = { value: 0 };
    const drawVortex = () => {
      vortex.clear();
      vortex.lineStyle(2.5, 0x8b5cf6, 0.86);
      vortex.beginPath();
      for (let index = 0; index < 28; index += 1) {
        const t = phase.value + index * 0.34;
        const radius = 5 + index * 1.35;
        const pointX = x + Math.cos(t) * radius;
        const pointY = y + Math.sin(t) * radius * 0.62;
        if (index === 0) vortex.moveTo(pointX, pointY);
        else vortex.lineTo(pointX, pointY);
      }
      vortex.strokePath();
    };
    drawVortex();
    this.scene.tweens.add({
      targets: phase,
      value: Math.PI * 5,
      duration: 760,
      ease: "Cubic.In",
      onUpdate: drawVortex,
      onComplete: () => vortex.destroy(),
    });
    this.playSparks(x, y, 0xa78bfa, 18, 1001);
  }

  private playGraveyardRestore(playerId: string, mode: "REVIVE" | "REBIRTH") {
    const x = this.scene.scale.width * 0.08;
    const y = playerId === "P1" ? this.scene.scale.height * 0.82 : this.scene.scale.height * 0.18;
    const color = mode === "REVIVE" ? 0xfbbf24 : 0x67e8f9;
    const accent = mode === "REVIVE" ? 0x86efac : 0xa78bfa;
    const altar = this.scene.add.container(x, y).setDepth(1000);
    const glow = this.scene.add.circle(0, 0, 11, color, 0.1).setStrokeStyle(2.5, color, 0.95);
    const core = this.scene.add.circle(0, 0, 4, accent, 0.8);
    const rays = this.scene.add.graphics();
    rays.lineStyle(1.5, color, 0.76);
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6;
      rays.lineBetween(Math.cos(angle) * 9, Math.sin(angle) * 9, Math.cos(angle) * 34, Math.sin(angle) * 34);
    }
    altar.add([rays, glow, core]);
    this.scene.tweens.add({
      targets: altar,
      scale: mode === "REVIVE" ? 2.65 : 2.15,
      alpha: 0,
      angle: mode === "REVIVE" ? 24 : -24,
      duration: mode === "REVIVE" ? 850 : 700,
      ease: "Cubic.Out",
      onComplete: () => altar.destroy(),
    });
    this.playSparks(x, y, color, mode === "REVIVE" ? 26 : 18, 1001);
  }

  private playImpact(x: number, y: number, coreColor: number, sparkColor: number, shakeIntensity: number) {
    this.scene.cameras.main.shake(250, shakeIntensity);
    const ring = this.scene.add.circle(x, y, 10, coreColor, 0.08).setStrokeStyle(3, coreColor, 0.95).setDepth(85);
    this.scene.tweens.add({
      targets: ring,
      radius: 52,
      alpha: 0,
      duration: 300,
      ease: "Cubic.Out",
      onComplete: () => ring.destroy(),
    });
    this.playSparks(x, y, sparkColor, 16, 86);
  }

  private playSparks(x: number, y: number, color: number, count: number, depth: number) {
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + Phaser.Math.FloatBetween(-0.15, 0.15);
      const distance = Phaser.Math.Between(22, 62);
      const spark = this.scene.add.circle(x, y, Phaser.Math.FloatBetween(1.2, 2.8), color, 0.95).setDepth(depth);
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: Phaser.Math.Between(260, 420),
        ease: "Cubic.Out",
        onComplete: () => spark.destroy(),
      });
    }
  }
}
