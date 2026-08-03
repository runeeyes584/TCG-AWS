import Phaser from "phaser";
import type { PlayerId } from "@backend/game/types";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";

/** Creates and owns board input targets. It never mutates game rules directly. */
export class ArenaInputSystem {
  private readonly targets = new Map<string, Phaser.GameObjects.Zone>();

  constructor(private readonly scene: Phaser.Scene) {}

  clear() {
    this.targets.forEach((target) => target.destroy());
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
  ) {
    const target = this.scene.add.zone(x, y, width, height).setDepth(2);
    if (rowType === "active") {
      target.setInteractive({ useHandCursor: true });
      target.on("pointerdown", () => arenaEventAdapter.emit("EMPTY_SLOT_CLICK", { playerId, index }));
    }
    this.targets.set(`${playerId}:${rowType}:${index}`, target);
    return target;
  }

  destroy() {
    this.clear();
  }
}
