import Phaser from "phaser";
import type { PlayerId } from "@backend/game/types";

export type UnitView = Phaser.GameObjects.Container & { unitId?: string };

export type ArenaSlotKind = "waiting" | "active";

export interface ArenaSlotPosition {
  x: number;
  y: number;
}

export interface ArenaRowDefinition {
  kind: ArenaSlotKind;
  playerId: PlayerId;
  units: import("@backend/game/types").UnitInstance[];
  y: number;
  alpha: number;
  scale: number;
}
