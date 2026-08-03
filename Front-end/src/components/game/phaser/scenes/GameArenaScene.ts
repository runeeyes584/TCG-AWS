import Phaser from "phaser";
import type { PlayerId, UnitInstance, VisualEvent } from "@backend/game/types";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { getArenaLayout, getSlotPosition } from "../config/arenaLayout";
import { ArenaBoardRenderer } from "../renders/ArenaBoardRenderer";
import { CardRenderer } from "../renders/CardRenderer";
import { drawCardLane } from "../renders/CardLaneRenderer";
import { ArenaStateSystem } from "../systems/ArenaStateSystem";
import { ArenaInputSystem } from "../systems/ArenaInputSystem";

/** Phaser orchestration layer. State remains authoritative in Zustand. */
export class GameArenaScene extends Phaser.Scene {
  private board?: Phaser.GameObjects.Graphics;
  private slots?: Phaser.GameObjects.Graphics;
  private readonly boardRenderer = new ArenaBoardRenderer(this);
  private readonly stateSystem = new ArenaStateSystem();
  private readonly inputSystem = new ArenaInputSystem(this);
  private readonly animationUnsubscriptions: Array<() => void> = [];
  private cards!: CardRenderer;
  private lastVisualSignature = "";

  constructor() { super({ key: "GameArenaScene" }); }

  create() {
    this.board = this.add.graphics().setDepth(0);
    this.slots = this.add.graphics().setDepth(1);
    this.cards = new CardRenderer(this, () => this.renderArena());
    this.stateSystem.start(() => this.renderArena());
    this.animationUnsubscriptions.push(
      arenaEventAdapter.on("SUMMON_UNIT", ({ unitId }) => this.cards.playSummon(unitId)),
      arenaEventAdapter.on("ATTACK_UNIT", ({ unitId }) => this.cards.playAttack(unitId)),
      arenaEventAdapter.on("DESTROY_UNIT", ({ unitId }) => this.cards.playDestroy(unitId)),
    );
    this.scale.on("resize", this.renderArena, this);
    this.events.once("shutdown", this.destroyScene, this);
    this.renderArena();
  }

  private destroyScene() {
    this.stateSystem.stop();
    this.animationUnsubscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    this.scale.off("resize", this.renderArena, this);
    this.cards.clear();
    this.inputSystem.destroy();
  }

  private renderArena() {
    const { gameState, viewerPlayerId, camera } = this.stateSystem.snapshot;
    if (!this.board || !this.slots || !gameState) return;
    const { width, height } = this.scale;
    const layout = getArenaLayout(width, height, camera.zoom, camera.tilt);
    this.boardRenderer.render(this.board, width, height, layout);
    this.slots.clear();
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
        { kind: 'waiting' as const, units: waitingUnits, y: isLocal ? height * 0.87 : height * 0.13, alpha: 0.58 },
        { kind: 'active' as const, units: activeUnits, y: isLocal ? height * 0.64 : height * 0.36, alpha: 0.95 },
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
          this.cards.create(unit, playerId, layout.cardWidth * rowScale, layout.cardHeight * rowScale).setPosition(point.x, point.y).setDepth(10 + point.y);
        });
      });
    });
    this.renderVisualEvents(gameState.visualEvents);
  }

  private renderVisualEvents(events: VisualEvent[]) {
    const signature = events.map((event) => JSON.stringify(event)).join('|');
    if (!signature || signature === this.lastVisualSignature) return;
    this.lastVisualSignature = signature;
    events.slice(-6).forEach((event) => {
      let message: string | undefined; let color = '#b8edff'; let targetId: string | undefined;
      if (event.type === 'DAMAGE') { message = `-${event.amount}`; color = '#ff817c'; targetId = event.isNexus ? undefined : event.targetId; }
      else if (event.type === 'HEAL') { message = `+${event.amount}`; color = '#7dffbf'; targetId = event.isNexus ? undefined : event.targetId; }
      else if (event.type === 'BUFF' || event.type === 'DEBUFF') { message = `${event.type === 'BUFF' ? 'BUFF' : 'DEBUFF'} ${event.attackDelta >= 0 ? '+' : ''}${event.attackDelta}`; color = event.type === 'BUFF' ? '#71e7ff' : '#ffb56e'; targetId = event.targetId; }
      else if (event.type === 'CHAMPION_LEVELED_UP') { message = `LEVEL ${event.newLevel}`; color = '#ffd66e'; targetId = event.unitId; }
      if (!message) return;
      const target = targetId ? this.cards.get(targetId) : undefined;
      const text = this.add.text(target?.x ?? this.scale.width / 2, (target?.y ?? this.scale.height / 2) - 20, message, { fontFamily: 'Arial, sans-serif', fontSize: '22px', fontStyle: 'bold', color, stroke: '#020817', strokeThickness: 5 }).setOrigin(0.5).setDepth(80);
      this.tweens.add({ targets: text, y: text.y - 34, alpha: 0, duration: 780, ease: 'Cubic.Out', onComplete: () => text.destroy() });
    });
  }
}
