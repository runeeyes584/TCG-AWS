import Phaser from "phaser";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { arenaStoreAdapter } from "../adapters/arenaStoreAdapter";

/** Card input only: selection and presentation events, never combat rules. */
export class CardInteractionSystem {
  constructor(private readonly scene: Phaser.Scene) {}

  bind(card: Phaser.GameObjects.Container, unit: UnitInstance, playerId: PlayerId) {
    card.setInteractive({ useHandCursor: true });
    card.on("pointerover", () => {
      arenaStoreAdapter.hoverEntity({ playerId, unitId: unit.instanceId });
      arenaEventAdapter.emit("HOVER_UNIT", { playerId, unitId: unit.instanceId });
      this.scene.tweens.add({ targets: card, scaleX: 1.045, scaleY: 1.045, duration: 120, ease: "Sine.Out" });
    });
    card.on("pointerout", () => {
      arenaStoreAdapter.hoverEntity(undefined);
      arenaEventAdapter.emit("HOVER_UNIT", undefined);
      this.scene.tweens.add({ targets: card, scaleX: 1, scaleY: 1, duration: 120, ease: "Sine.Out" });
    });
    card.on("pointerdown", () => {
      arenaStoreAdapter.selectEntity({ playerId, unitId: unit.instanceId });
      arenaEventAdapter.emit("SELECT_UNIT", { playerId, unitId: unit.instanceId });
    });
  }
}
