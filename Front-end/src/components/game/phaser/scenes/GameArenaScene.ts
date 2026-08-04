import Phaser from "phaser";
import type { GameState, PlayerId, SpellTargetKind, UnitInstance, VisualEvent } from "@backend/game/types";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { getArenaLayout, getSlotPosition } from "../config/arenaLayout";
import { ArenaBoardRenderer } from "../renders/ArenaBoardRenderer";
import { CardRenderer } from "../renders/CardRenderer";
import { drawCardLane, drawDefendCardLane } from "../renders/CardLaneRenderer";
import { ArenaStateSystem } from "../systems/ArenaStateSystem";
import { ArenaInputSystem } from "../systems/ArenaInputSystem";
import { CombatVFXSystem } from "../systems/CombatVFXSystem";
import { ArenaBackgroundManager } from "../systems/ArenaBackgroundManager";

/** Phaser orchestration layer. State remains authoritative in Zustand. */
export class GameArenaScene extends Phaser.Scene {
  private board?: Phaser.GameObjects.Graphics;
  private slots?: Phaser.GameObjects.Graphics;
  private defendSlots?: Phaser.GameObjects.Graphics;
  private readonly boardRenderer = new ArenaBoardRenderer(this);
  private readonly stateSystem = new ArenaStateSystem();
  private readonly inputSystem = new ArenaInputSystem(this);
  private combatVfx!: CombatVFXSystem;
  private centerSprite?: Phaser.GameObjects.Sprite;
  private centerSpriteTween?: Phaser.Tweens.Tween;
  private readonly animationUnsubscriptions: Array<() => void> = [];
  private cards!: CardRenderer;
  private lastVisualSignature = "";
  private readonly seenVisualEvents = new Set<string>();
  private defendSignature = "";
  private defendBreathAlpha = 0.5;
  private defendDashOffset = 0;
  private defendBreathTween?: Phaser.Tweens.Tween;
  private defendDashTween?: Phaser.Tweens.Tween;
  private targeting:
    | { targetKind: Extract<SpellTargetKind, "ALLY_UNIT" | "ENEMY_UNIT">; playerId: PlayerId }
    | undefined;
  private background!: ArenaBackgroundManager;

  constructor() { super({ key: "GameArenaScene" }); }

  create() {
    // Background layer (rendered below everything)
    this.background = new ArenaBackgroundManager(this);
    this.background.init(this.scale.width, this.scale.height);

    this.board = this.add.graphics().setDepth(0.5);
    this.slots = this.add.graphics().setDepth(1);
    this.defendSlots = this.add.graphics().setDepth(1.5);
    this.createCenterSprite();
    this.cards = new CardRenderer(this, () => this.renderArena());
    this.combatVfx = new CombatVFXSystem(
      this,
      (unitId) => this.cards.get(unitId),
      (unitId, kind) => this.cards.playEffect(unitId, kind),
    );
    this.stateSystem.start(() => this.renderArena());
    this.animationUnsubscriptions.push(
      arenaEventAdapter.on("SUMMON_UNIT", ({ unitId }) => {
        this.cards.playSummon(unitId);
        this.combatVfx.playSummon(unitId);
      }),
      arenaEventAdapter.on("ATTACK_UNIT", ({ unitId }) => {
        this.cards.playAttack(unitId);
        this.combatVfx.playAttack(unitId);
      }),
      arenaEventAdapter.on("DESTROY_UNIT", ({ unitId }) => this.cards.playDestroy(unitId)),
      arenaEventAdapter.on("TARGETING_CHANGED", ({ targetKind, playerId }) => {
        this.targeting = targetKind ? { targetKind, playerId: playerId || this.stateSystem.snapshot.viewerPlayerId || "P1" } : undefined;
        this.renderArena();
      }),
    );
    this.scale.on("resize", this.renderArena, this);
    this.events.once("shutdown", this.destroyScene, this);
    this.renderArena();
  }

  update(_time: number, delta: number) {
    const phase = this.stateSystem.snapshot.gameState?.phase ?? "ACTION";
    this.background.tick(delta, this.scale.width, this.scale.height, phase);
  }

  private destroyScene() {
    this.stateSystem.stop();
    this.animationUnsubscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    this.scale.off("resize", this.renderArena, this);
    this.cards.destroy();
    this.background.destroy();
    this.centerSpriteTween?.stop();
    this.centerSprite?.destroy();
    this.defendBreathTween?.stop();
    this.defendDashTween?.stop();
    this.defendSlots?.destroy();
    this.inputSystem.destroy();
  }

  private renderArena() {
    const { gameState, viewerPlayerId, camera } = this.stateSystem.snapshot;
    if (!this.board || !this.slots || !this.defendSlots || !gameState) return;
    const { width, height } = this.scale;
    const layout = getArenaLayout(width, height, camera.zoom, camera.tilt);
    this.updateCenterSprite(width, height, gameState.phase);
    this.boardRenderer.render(this.board, width, height, layout);
    this.slots.clear();
    this.defendSlots.clear();
    this.cards.clear();
    this.inputSystem.clear();

    (['P1', 'P2'] as PlayerId[]).forEach((playerId) => {
      const isLocal = playerId === viewerPlayerId;
      const unitScale = isLocal ? 1 : 0.9;
      const playerUnits = gameState.players[playerId].board;
      const inCombat = gameState.combat.attackers.length > 0;
      const activeUnits: Array<UnitInstance | undefined> = inCombat
        ? gameState.combat.attackers.map((lane) => {
            const unitId = playerId === gameState.attackTokenPlayerId ? lane.attackerId : lane.blockerId;
            return unitId ? playerUnits.find((unit) => unit.instanceId === unitId) : undefined;
          })
        : playerUnits.filter((unit) => unit.boardRow === 'ACTIVE');
      const activeIds = new Set(activeUnits.filter((unit): unit is UnitInstance => Boolean(unit)).map((unit) => unit.instanceId));
      const waitingUnits = playerUnits.filter((unit) => !activeIds.has(unit.instanceId));
      [
        { kind: 'waiting' as const, units: waitingUnits, y: isLocal ? height * 0.75 : height * 0.25, alpha: 0.58 },
        { kind: 'active' as const, units: activeUnits, y: isLocal ? height * 0.62 : height * 0.38, alpha: 0.95 },
      ].forEach(({ kind, units, y, alpha }) => {
        const rowScale = unitScale * (kind === 'waiting' ? 0.82 : 1);
        const color = isLocal ? 0x2dd4bf : 0x9b8cff;
        for (let index = 0; index < 6; index += 1) {
          const point = getSlotPosition(index, y, width, rowScale);
          const laneWidth = layout.cardWidth * rowScale;
          const laneHeight = layout.cardHeight * rowScale;
          drawCardLane(this.slots!, point.x, point.y, laneWidth, laneHeight, color, alpha);
          this.inputSystem.createSlotTarget(playerId, kind, index, point.x, point.y, laneWidth, laneHeight);
        }
        units.slice(0, 6).forEach((unit, index) => {
          if (!unit) return;
          const point = getSlotPosition(index, y, width, rowScale);
          const casterId = this.targeting?.playerId || viewerPlayerId || "P1";
          const targetKind = this.targeting?.targetKind;
          const isCasterUnit = playerId === casterId;

          const isAllyTarget = Boolean(targetKind === "ALLY_UNIT" && isCasterUnit);
          const isEnemyTarget = Boolean(targetKind === "ENEMY_UNIT" && !isCasterUnit);

          const isTargetable = isAllyTarget || isEnemyTarget;
          const targetType: "ally" | "enemy" | undefined = isAllyTarget ? "ally" : isEnemyTarget ? "enemy" : undefined;

          this.cards.create(unit, playerId, layout.cardWidth * rowScale, layout.cardHeight * rowScale, isTargetable, targetType)
            .setPosition(point.x, point.y)
            .setDepth(10 + point.y);
        });
      });
    });
    this.renderDefendSlots(gameState, viewerPlayerId, width, height, layout.cardWidth);
    this.renderVisualEvents(gameState.visualEvents);
  }

  private createCenterSprite() {
    const key = "arena-mystic-center-sprite";
    if (!this.textures.exists(key)) {
      const size = 48;
      const rune = this.add.graphics();
      rune.lineStyle(2, 0x8b5cf6, 0.78);
      rune.strokeCircle(size / 2, size / 2, 17);
      rune.lineStyle(1, 0xf59e0b, 0.7);
      rune.strokeCircle(size / 2, size / 2, 10);
      rune.lineBetween(8, 31, 40, 17);
      rune.lineBetween(17, 40, 31, 8);
      rune.fillStyle(0xfbbf24, 0.9).fillCircle(size / 2, size / 2, 2.5);
      rune.generateTexture(key, size, size);
      rune.destroy();
    }
    this.centerSprite = this.add.sprite(0, 0, key)
      .setDepth(2.2)
      .setAlpha(0.2)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.centerSpriteTween = this.tweens.add({
      targets: this.centerSprite,
      angle: 360,
      alpha: { from: 0.16, to: 0.3 },
      duration: 8400,
      ease: "Linear",
      repeat: -1,
    });
  }

  private updateCenterSprite(width: number, height: number, phase: GameState["phase"]) {
    if (!this.centerSprite) return;
    this.centerSprite.setPosition(width / 2, height / 2);
    const tint = phase === "COMBAT" ? 0xfb7185 : phase === "BLOCK" ? 0xfbbf24 : 0x8b5cf6;
    this.centerSprite.setTint(tint);
  }

  private renderDefendSlots(
    gameState: GameState,
    viewerPlayerId: PlayerId,
    width: number,
    height: number,
    cardWidth: number,
  ) {
    if (!this.defendSlots) return;
    const defenderId: PlayerId = gameState.attackTokenPlayerId === "P1" ? "P2" : "P1";
    const active = gameState.phase === "BLOCK" && viewerPlayerId === defenderId && gameState.priorityPlayerId === defenderId;
    const signature = active ? `${width}:${height}:${defenderId}:${cardWidth}` : "off";
    if (signature !== this.defendSignature) {
      this.defendSignature = signature;
      this.defendBreathTween?.stop();
      this.defendDashTween?.stop();
      if (active) {
        this.defendBreathAlpha = 0.5;
        this.defendDashOffset = 0;
        this.defendBreathTween = this.tweens.add({
          targets: this,
          defendBreathAlpha: 1,
          duration: 850,
          ease: "Sine.InOut",
          yoyo: true,
          repeat: -1,
          onUpdate: () => this.drawDefendSlots(defenderId, width, height, cardWidth),
        });
        this.defendDashTween = this.tweens.add({
          targets: this,
          defendDashOffset: 1,
          duration: 1400,
          ease: "Linear",
          repeat: -1,
          onUpdate: () => this.drawDefendSlots(defenderId, width, height, cardWidth),
        });
      }
    }
    if (active) this.drawDefendSlots(defenderId, width, height, cardWidth);
  }

  private drawDefendSlots(defenderId: PlayerId, width: number, height: number, cardWidth: number) {
    if (!this.defendSlots) return;
    this.defendSlots.clear();
    this.defendSlots.setData("dashOffset", this.defendDashOffset);
    const y = defenderId === "P1" ? height * 0.62 : height * 0.38;
    const scale = 1;
    const laneWidth = cardWidth * scale;
    const laneHeight = laneWidth * 1.38;
    for (let index = 0; index < 6; index += 1) {
      const point = getSlotPosition(index, y, width, scale);
      drawDefendCardLane(this.defendSlots, point.x, point.y, laneWidth, laneHeight, this.defendBreathAlpha, scale);
    }
  }

  private renderVisualEvents(events: VisualEvent[]) {
    const signature = events.map((event) => JSON.stringify(event)).join('|');
    if (!signature || signature === this.lastVisualSignature) return;
    this.lastVisualSignature = signature;
    events.slice(-6).forEach((event) => {
      const eventKey = JSON.stringify(event);
      const isNewEvent = !this.seenVisualEvents.has(eventKey);
      this.seenVisualEvents.add(eventKey);
      if (this.seenVisualEvents.size > 40) this.seenVisualEvents.delete(this.seenVisualEvents.values().next().value as string);
      let message: string | undefined; let color = '#b8edff'; let targetId: string | undefined;
      if (event.type === 'DAMAGE') {
        message = `-${event.amount}`;
        color = '#ff817c';
        targetId = event.isNexus ? undefined : event.targetId;
      }
      else if (event.type === 'HEAL') { message = `+${event.amount}`; color = '#7dffbf'; targetId = event.isNexus ? undefined : event.targetId; }
      else if (event.type === 'BUFF' || event.type === 'DEBUFF') {
        const isBuff = event.type === 'BUFF';
        const parts: string[] = [];
        if (event.attackDelta !== 0) {
          parts.push(`${event.attackDelta > 0 ? '+' : ''}${event.attackDelta} ATK`);
        }
        if (event.healthDelta !== 0) {
          parts.push(`${event.healthDelta > 0 ? '+' : ''}${event.healthDelta} HP`);
        }
        message = parts.length > 0 ? parts.join('  ') : (isBuff ? '+BUFF' : '-DEBUFF');
        color = isBuff ? '#22c55e' : '#ef4444';
        targetId = event.targetId;
        if (isNewEvent) {
          this.combatVfx.playBuffDebuff(event.targetId, event.type);
        }
      }
      else if (event.type === 'CHAMPION_LEVELED_UP') { message = `LEVEL ${event.newLevel}`; color = '#ffd66e'; targetId = event.unitId; }
      if (isNewEvent) this.combatVfx.playVisualEvent(event);
      if (!message) return;
      const target = targetId ? this.cards.get(targetId) : undefined;
      const targetDepth = target ? target.depth + 500 : 9999;
      const startY = target ? target.y - target.height / 2 - 18 : this.scale.height / 2 - 24;
      const text = this.add.text(target?.x ?? this.scale.width / 2, startY, message, {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: '22px',
        fontStyle: 'bold',
        color,
        stroke: '#020817',
        strokeThickness: 7,
        shadow: { offsetX: 0, offsetY: 2, color, blur: 10, fill: true }
      }).setOrigin(0.5).setDepth(targetDepth);
      const displayDuration = (event.type === 'BUFF' || event.type === 'DEBUFF') ? 3000 : 850;
      this.tweens.add({ targets: text, y: text.y - 48, alpha: 0, duration: displayDuration, ease: 'Cubic.Out', onComplete: () => text.destroy() });
    });
  }
}
