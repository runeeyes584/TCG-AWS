import * as Phaser from "phaser";
import type { GameState, PlayerId, SpellTargetKind, UnitInstance, VisualEvent } from "@backend/game/types";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { NEXUS_CORE_RADIUS, boundsOf, createArenaProjection, rowKeyFor, type ArenaProjection, type ArenaRowKey, type SlotGeometry } from "../config/arenaProjection";
import { densityOf, logicalSize } from "../config/arenaScale";
import { NexusCoreRenderer } from "../renders/NexusCoreRenderer";
import { ArenaTableRenderer } from "../renders/ArenaTableRenderer";
import { PassSealRenderer } from "../renders/PassSealRenderer";
import { NexusCarryFx } from "../renders/NexusCarryFx";
import { TurnBannerFx } from "../renders/TurnBannerFx";
import { RiftSigil } from "../renders/RiftSigil";
import { GLIDE_MS } from "../config/declareMotion";
import { laneLinks } from "../config/laneLinks";
import { DeclareFx } from "../renders/DeclareFx";
import { LaneBlades } from "../renders/LaneBlades";
import { splitBoardRows } from "../config/boardRows";
import { CardRenderer } from "../renders/CardRenderer";
import { drawDefendSlot, drawValidSlot } from "../renders/CardLaneRenderer";
import { ArenaStateSystem } from "../systems/ArenaStateSystem";
import { ArenaInputSystem } from "../systems/ArenaInputSystem";
import { CombatVFXSystem } from "../systems/CombatVFXSystem";
import { ArenaAtmosphere } from "../systems/ArenaAtmosphere";
import { ArenaShards } from "../systems/ArenaShards";
import { UiShieldGuard } from "../systems/UiShieldGuard";

/** Phaser orchestration layer. State remains authoritative in Zustand. */
export class GameArenaScene extends Phaser.Scene {
  private slots?: Phaser.GameObjects.Graphics;
  private slotFx?: Phaser.GameObjects.Graphics;
  private defendSlots?: Phaser.GameObjects.Graphics;
  private table!: ArenaTableRenderer;
  private nexus!: NexusCoreRenderer;
  private passSeal!: PassSealRenderer;
  private carryFx!: NexusCarryFx;
  /** The card picked on the table, which is drawn with a ring round it. */
  private pickedUnitId?: string;
  private uiShield?: UiShieldGuard;
  private turnBanner!: TurnBannerFx;
  private riftSigil!: RiftSigil;
  private declareFx!: DeclareFx;
  private laneBlades!: LaneBlades;
  private projection?: ArenaProjection;
  private hoveredSlot?: SlotGeometry;
  private fxElapsed = 0;
  private readonly stateSystem = new ArenaStateSystem();
  private readonly inputSystem = new ArenaInputSystem(this);
  private combatVfx!: CombatVFXSystem;
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
  private readonly barrierUnitIds = new Set<string>();
  private atmosphere!: ArenaAtmosphere;
  private shards!: ArenaShards;

  private isSceneDestroyed = false;

  constructor() { super({ key: "GameArenaScene" }); }

  create() {
    this.isSceneDestroyed = false;
    this.fitCamera();
    // A click on a DOM control drawn over the table is the DOM's, not the table's.
    this.uiShield = new UiShieldGuard();
    // A right click on a card opens its codex: the browser's own menu has no business over the table.
    this.input.mouse?.disableContextMenu();

    // Layers, back to front: atmosphere, table (+sockets), slot fx, Nexus cores, cards.
    this.atmosphere = new ArenaAtmosphere(this);
    this.table = new ArenaTableRenderer(this);
    this.nexus = new NexusCoreRenderer(this);
    this.shards = new ArenaShards(this);
    this.passSeal = new PassSealRenderer(this);
    this.carryFx = new NexusCarryFx(this);
    this.turnBanner = new TurnBannerFx(this);
    this.riftSigil = new RiftSigil(this);
    this.slots = this.add.graphics().setDepth(1);
    this.slotFx = this.add.graphics().setDepth(1.4);
    this.defendSlots = this.add.graphics().setDepth(1.5);
    this.cards = new CardRenderer(this, () => this.renderArena());
    this.declareFx = new DeclareFx(this);
    this.laneBlades = new LaneBlades(this);
    this.cards.onDeclare = (info) => this.declareFx.play(info);
    this.combatVfx = new CombatVFXSystem(
      this,
      (unitId) => this.cards.get(unitId),
      (unitId, kind) => this.cards.playEffect(unitId, kind),
      (unitId, jolt) => this.cards.nudge(unitId, jolt),
      (playerId) => this.nexus.anchorFor(playerId as PlayerId, this.stateSystem.snapshot.viewerPlayerId),
    );
    this.stateSystem.start(() => this.renderArena());
    this.animationUnsubscriptions.push(
      arenaEventAdapter.on("SUMMON_UNIT", ({ unitId }) => {
        if (this.isSceneDestroyed) return;
        this.cards.playSummon(unitId);
        this.combatVfx.playSummon(unitId);
      }),
      arenaEventAdapter.on("COMMIT_CUE", ({ kind, unitIds }) => {
        if (this.isSceneDestroyed) return;
        if (kind === "attack") unitIds.forEach((unitId) => this.cards.playAttack(unitId));
        this.combatVfx.playCommit(kind, unitIds);
      }),
      arenaEventAdapter.on("CHAMPION_DECLARED", ({ unitId }) => {
        if (this.isSceneDestroyed) return;
        this.combatVfx.playChampionDeclared(unitId, GLIDE_MS);
      }),
      arenaEventAdapter.on("DESTROY_UNIT", ({ unitId }) => {
        if (this.isSceneDestroyed) return;
        this.cards.playDestroy(unitId);
      }),
      arenaEventAdapter.on("UNIT_PICKED", ({ unitId }) => {
        if (this.isSceneDestroyed || unitId === this.pickedUnitId) return;
        this.pickedUnitId = unitId;
        this.renderArena();
      }),
      arenaEventAdapter.on("TARGETING_CHANGED", ({ targetKind, playerId }) => {
        if (this.isSceneDestroyed) return;
        this.targeting = targetKind ? { targetKind, playerId: playerId || this.stateSystem.snapshot.viewerPlayerId || "P1" } : undefined;
        this.renderArena();
      }),
    );
    // The camera is fitted before the arena is drawn again (it is listed first).
    this.scale.on("resize", this.fitCamera, this);
    this.scale.on("resize", this.renderArena, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroyScene, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.destroyScene, this);
    this.renderArena();
  }

  update(_time: number, delta: number) {
    if (this.isSceneDestroyed || !this.atmosphere) return;
    this.fxElapsed += delta * 0.001;
    this.atmosphere.tick(delta);
    this.nexus.tick(delta);
    this.shards.tick(delta);
    this.passSeal.tick(delta);
    this.carryFx.tick(delta);
    this.turnBanner.tick(delta);
    this.riftSigil.tick(delta);
    this.declareFx.tick(delta);
    this.laneBlades.tick(delta);
    if (this.hoveredSlot) this.drawHoveredSlot();
  }

  private drawHoveredSlot() {
    if (!this.slotFx) return;
    this.slotFx.clear();
    if (!this.hoveredSlot) return;
    drawValidSlot(this.slotFx, this.hoveredSlot, 0.5 + 0.5 * Math.sin(this.fxElapsed * 5));
  }

  private destroyScene() {
    if (this.isSceneDestroyed) return;
    this.isSceneDestroyed = true;

    this.stateSystem.stop();
    this.animationUnsubscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    this.scale.off("resize", this.fitCamera, this);
    this.scale.off("resize", this.renderArena, this);
    this.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroyScene, this);
    this.events.off(Phaser.Scenes.Events.DESTROY, this.destroyScene, this);

    this.uiShield?.destroy();
    this.uiShield = undefined;
    this.cards?.destroy();
    this.atmosphere?.destroy();
    this.table?.destroy();
    this.nexus?.destroy();
    this.shards?.destroy();
    this.passSeal?.destroy();
    this.carryFx?.destroy();
    this.turnBanner?.destroy();
    this.riftSigil?.destroy();
    this.declareFx?.destroy();
    this.laneBlades?.destroy();

    this.defendBreathTween?.stop();
    this.defendDashTween?.stop();
    this.defendSlots?.destroy();
    this.defendSlots = undefined;

    this.slots?.destroy();
    this.slots = undefined;

    this.slotFx?.destroy();
    this.slotFx = undefined;

    this.inputSystem?.destroy();
  }

  /**
   * The canvas has `dpr` pixels for each logical one, and the whole arena is laid out in logical pixels:
   * the camera zooms by `dpr` about the middle of the logical area, which also turns the pointer back into
   * logical pixels.
   */
  private fitCamera() {
    const camera = this.cameras?.main;
    if (!camera) return;
    const { width, height } = logicalSize(this.scale);
    camera.setZoom(densityOf(this.scale));
    camera.centerOn(width / 2, height / 2);
  }

  private renderArena() {
    if (this.isSceneDestroyed || !this.sys?.isActive() || !this.add || !this.slots || !this.slotFx || !this.defendSlots) return;
    const { gameState, viewerPlayerId, camera } = this.stateSystem.snapshot;
    if (!gameState) return;
    const { width, height } = logicalSize(this.scale);
    const proj = createArenaProjection(width, height, camera.tilt, camera.zoom);
    this.projection = proj;
    this.publishRift(proj);
    const signature = `${width}x${height}:${camera.tilt}:${camera.zoom}`;
    this.atmosphere.render(proj, signature);
    this.table.render(proj, signature);
    this.nexus.layout(proj, signature);
    this.shards.layout(proj, signature);
    this.passSeal.place();
    this.turnBanner.layout(proj);
    this.riftSigil.layout(proj);
    this.nexus.update({ P1: gameState.players.P1.nexusHp, P2: gameState.players.P2.nexusHp }, viewerPlayerId);
    this.slots.clear();
    this.slotFx.clear();
    this.hoveredSlot = undefined;
    this.defendSlots.clear();
    this.cards.clear();
    this.inputSystem.clear();

    const currentBarrierIds = new Set<string>();
    const renderedUnitIds = new Set<string>();

    (['P1', 'P2'] as PlayerId[]).forEach((playerId) => {
      const isLocal = playerId === viewerPlayerId;
      const playerUnits = gameState.players[playerId].board;
      const inCombat = gameState.combat.attackers.length > 0;
      const { active: activeUnits, waiting: waitingUnits } = splitBoardRows(
        playerUnits,
        gameState.combat.attackers,
        playerId,
        gameState.attackTokenPlayerId
      );
      [
        { kind: 'waiting' as const, units: waitingUnits },
        { kind: 'active' as const, units: activeUnits },
      ].forEach(({ kind, units }) => {
        const row: ArenaRowKey = rowKeyFor(isLocal, kind);
        for (let index = 0; index < 6; index += 1) {
          const slot = proj.slot(row, index);
          const slotBox = boundsOf(slot.quad);
          this.inputSystem.createSlotTarget(
            playerId,
            kind,
            index,
            slotBox.x + slotBox.width / 2,
            slotBox.y + slotBox.height / 2,
            slotBox.width,
            slotBox.height,
            (hovering) => {
              this.hoveredSlot = hovering ? slot : undefined;
              if (!hovering) this.slotFx?.clear();
            },
          );
        }
        units.slice(0, 6).forEach((unit, index) => {
          if (!unit) return;
          const slot = proj.slot(row, index);
          const casterId = this.targeting?.playerId || viewerPlayerId || "P1";
          const targetKind = this.targeting?.targetKind;
          const isCasterUnit = playerId === casterId;

          const isAllyTarget = Boolean(targetKind === "ALLY_UNIT" && isCasterUnit);
          const isEnemyTarget = Boolean(targetKind === "ENEMY_UNIT" && !isCasterUnit);

          const isTargetable = isAllyTarget || isEnemyTarget;
          const targetType: "ally" | "enemy" | undefined = isAllyTarget ? "ally" : isEnemyTarget ? "enemy" : undefined;

          const hasBarrier = Boolean(unit.keywords?.includes("BARRIER") || unit.temporaryKeywords?.includes("BARRIER"));
          if (hasBarrier) {
            currentBarrierIds.add(unit.instanceId);
          }

          // The card lies flat in its lane at the lane's full size. In combat every card of an active
          // lane (attacker or blocker) is marked: blood-red edge for an attacker, gold for a blocker.
          renderedUnitIds.add(unit.instanceId);
          const inLane = inCombat && kind === 'active';
          this.cards.create(unit, playerId, proj.cardPlacement(slot), {
            isTargetable,
            targetType,
            picked: unit.instanceId === this.pickedUnitId,
            inLane,
            role: inLane ? (playerId === gameState.attackTokenPlayerId ? 'attack' : 'defend') : undefined,
          });

          if (hasBarrier && !this.barrierUnitIds.has(unit.instanceId)) {
            this.cards.playBarrierTrigger(unit.instanceId);
          }
        });
      });
    });

    this.barrierUnitIds.clear();
    currentBarrierIds.forEach((id) => this.barrierUnitIds.add(id));
    this.cards.prune(renderedUnitIds);

    const isChampion = (unitId: string) =>
      (['P1', 'P2'] as PlayerId[]).some((playerId) =>
        gameState.players[playerId].board.some(
          (unit) => unit.instanceId === unitId && getCardDefinition(unit.cardId).type === 'champion'
        )
      );
    this.laneBlades.setLanes(laneLinks(gameState, viewerPlayerId, isChampion), proj);

    this.renderDefendSlots(gameState, viewerPlayerId, proj);
    this.renderVisualEvents(gameState.visualEvents);
  }

  /**
   * Shares the rift with the card animations (registry) and with the DOM turn rail, which
   * stands in the gutter left of the rift: its height, where the table edge is there and how
   * far that edge leans, so the rail's frames can lie along it.
   */
  private publishRift(proj: ArenaProjection) {
    this.registry.set("arenaRiftY", proj.riftY);
    const table = this.game.canvas?.closest<HTMLElement>(".lor-table");
    table?.style.setProperty("--arena-rift-y", `${proj.riftY.toFixed(1)}px`);
    table?.style.setProperty("--arena-table-left-at-rift", `${proj.riftEdge.left.toFixed(1)}px`);
    table?.style.setProperty("--arena-edge-skew", `${(Math.atan(proj.riftEdge.slope) * 180 / Math.PI).toFixed(2)}deg`);
  }

  private renderDefendSlots(gameState: GameState, viewerPlayerId: PlayerId, proj: ArenaProjection) {
    if (!this.defendSlots) return;
    const defenderId: PlayerId = gameState.attackTokenPlayerId === "P1" ? "P2" : "P1";
    const active = gameState.phase === "BLOCK" && viewerPlayerId === defenderId && gameState.priorityPlayerId === defenderId;
    const signature = active ? `${proj.width}:${proj.height}:${defenderId}` : "off";
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
          onUpdate: () => this.drawDefendSlots(proj),
        });
        this.defendDashTween = this.tweens.add({
          targets: this,
          defendDashOffset: 1,
          duration: 1400,
          ease: "Linear",
          repeat: -1,
          onUpdate: () => this.drawDefendSlots(proj),
        });
      }
    }
    if (active) this.drawDefendSlots(proj);
  }

  private drawDefendSlots(proj: ArenaProjection) {
    if (!this.defendSlots) return;
    this.defendSlots.clear();
    this.defendSlots.setData("dashOffset", this.defendDashOffset);
    // Blocking only happens for the local player, whose front row is "meActive".
    for (let index = 0; index < 6; index += 1) {
      const slot = proj.slot("meActive", index);
      drawDefendSlot(this.defendSlots, slot.quad, this.defendBreathAlpha, proj.widthAt(slot.s) / proj.wNear);
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
      let nexusPlayerId: PlayerId | undefined;
      if (event.type === 'DAMAGE') {
        message = `-${event.amount}`;
        color = '#ff817c';
        targetId = event.isNexus ? undefined : event.targetId;
        if (event.isNexus) nexusPlayerId = event.targetId.replace('nexus-', '') as PlayerId;
      }
      else if (event.type === 'HEAL') {
        message = `+${event.amount}`;
        color = '#7dffbf';
        targetId = event.isNexus ? undefined : event.targetId;
        if (event.isNexus) nexusPlayerId = event.targetId.replace('nexus-', '') as PlayerId;
      }
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
      const core = nexusPlayerId ? this.nexus.anchorFor(nexusPlayerId, this.stateSystem.snapshot.viewerPlayerId) : undefined;
      const targetDepth = target ? target.depth + 500 : 9999;
      const startY = target
        ? target.y - ((target.getData("topExtent") as number | undefined) ?? target.height / 2) - 18
        : core
          ? core.y - (this.projection ? NEXUS_CORE_RADIUS * this.projection.nexus.scale : 0) - 14
          : (this.projection?.riftY ?? logicalSize(this.scale).height / 2) - 24;
      const text = this.add.text(target?.x ?? core?.x ?? logicalSize(this.scale).width / 2, startY, message, {
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
