import * as Phaser from "phaser";
import { logicalSize } from "../config/arenaScale";
import type { VisualEvent } from "@backend/game/types";
import type { UnitView } from "../types/arenaTypes";
import type { Jolt } from "../renders/CardRenderer";
import { getEffectKind, getEffectTargetId, type SpellEffectKind } from "../../visualEffectSemantics";

/** The shake of the big moments. */
const COMMIT_SHAKE = { ms: 250, intensity: 0.012 } as const;

/** Procedural combat feedback that works with both WebGL and Canvas fallback. */
export class CombatVFXSystem {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly resolveCard: (unitId: string) => UnitView | undefined,
    private readonly playCardEffect: (unitId: string, kind: SpellEffectKind) => void,
    /** Shakes a card without taking over its position (it may be on its way back to the waiting row). */
    private readonly joltCard: (unitId: string, jolt: Jolt) => void,
    /** Screen position of a player's Nexus altar (falls back to the old fixed spots). */
    private readonly getNexusAnchor?: (playerId: string) => { x: number; y: number } | undefined,
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
    // The graveyards have their own effect on the pile where it really is (GraveyardFx); BANISH and
    // GRAVEYARD_RESTORE have no card on the table to mark, so they end at the graveyard check below.

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

    this.joltCard(unitId, { axis: "x", from: -2.5, to: 2.5, duration: 45, ease: "Sine.InOut", yoyo: true, repeat: 2 });

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

  /**
   * The attack or the blocks were committed: one shake of the screen, and a small ring and sparks on
   * each card in the fight (those do not shake again). Declaring an ordinary unit has no cue of its own.
   */
  playCommit(kind: "attack" | "defend", unitIds: string[]) {
    this.shakeScreen();
    const [core, spark] = kind === "attack" ? [0xffc857, 0x8b5cf6] : [0x8b5cf6, 0xe8c26a];
    unitIds.forEach((unitId) => {
      const card = this.resolveCard(unitId);
      if (card) this.playImpact(card.x, card.y, core, spark, 0);
    });
  }

  /** A champion was declared: it glides up first, then the screen shakes and a gold ring marks it. */
  playChampionDeclared(unitId: string, afterMs: number) {
    this.scene.time.delayedCall(afterMs, () => {
      if (!this.scene.sys?.isActive()) return;
      this.shakeScreen();
      const card = this.resolveCard(unitId);
      if (card) this.playImpact(card.x, card.y, 0xffc857, 0xe8c26a, 0);
    });
  }

  /** The screen shake of the big moments (declaring a champion, committing the attack or the blocks); never with reduced motion. */
  private shakeScreen() {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    this.scene.cameras.main.shake(COMMIT_SHAKE.ms, COMMIT_SHAKE.intensity);
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
    const nexusAnchor = card ? undefined : this.getNexusAnchor?.(targetId);
    const x = card?.x ?? nexusAnchor?.x ?? logicalSize(this.scene.scale).width / 2;
    const y = card?.y ?? nexusAnchor?.y ?? (targetId === "P1" ? logicalSize(this.scene.scale).height * 0.12 : logicalSize(this.scene.scale).height * 0.88);
    this.playImpact(x, y, 0xff5d73, 0xef4444, isNexus ? 0.025 : 0.009);
    if (card) this.joltCard(targetId, { axis: "x", from: -5, to: 5, duration: 55, yoyo: true, repeat: 3 });
  }

  private nexusPlayerId(targetId: string) {
    return targetId.startsWith("nexus-") ? targetId.slice("nexus-".length) : targetId;
  }

  private playNexusImpact(playerId: string, coreColor: number, edgeColor: number, damage: boolean) {
    const width = logicalSize(this.scene.scale).width;
    const height = logicalSize(this.scene.scale).height;
    const anchor = this.getNexusAnchor?.(playerId);
    const x = anchor?.x ?? width / 2;
    const y = anchor?.y ?? (playerId === "P1" ? height * 0.1 : height * 0.9);
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

  private playImpact(x: number, y: number, coreColor: number, sparkColor: number, shakeIntensity: number) {
    if (shakeIntensity > 0) this.scene.cameras.main.shake(250, shakeIntensity);
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
