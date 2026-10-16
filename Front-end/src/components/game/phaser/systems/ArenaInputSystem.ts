import type Phaser from "phaser";
import type { PlayerId } from "@backend/game/types";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { isShieldedPointer } from "../config/uiShield";

/** Creates and owns board input targets. It never mutates game rules directly. */
export class ArenaInputSystem {
  private readonly targets = new Map<string, Phaser.GameObjects.Zone>();

  constructor(private readonly scene: Phaser.Scene) {}

  clear() {
    this.targets.forEach((target) => {
      if (target.active) {
        target.destroy();
      }
    });
    this.targets.clear();
  }

  createSlotTarget(
    playerId: PlayerId,
    rowType: "waiting" | "active",
    index: number,
    x: number,
    y: number,
    width: number,
    height: number,
    onHover?: (hovering: boolean) => void,
  ) {
    if (!this.scene?.sys?.isActive() || !this.scene?.add) return undefined;
    const target = this.scene.add.zone(x, y, width, height).setDepth(2);
    if (rowType === "active") {
      target.setInteractive({ useHandCursor: true });
      target.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (isShieldedPointer(pointer)) return;
        arenaEventAdapter.emit("EMPTY_SLOT_CLICK", { playerId, index });
      });
      if (onHover) {
        target.on("pointerover", () => onHover(true));
        target.on("pointerout", () => onHover(false));
      }
    }
    this.targets.set(`${playerId}:${rowType}:${index}`, target);
    return target;
  }

  destroy() {
    this.clear();
  }
}
