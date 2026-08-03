import type { GameState } from "@backend/game/types";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { arenaStoreAdapter, type ArenaStoreSnapshot } from "../adapters/arenaStoreAdapter";

/** Owns the bridge lifecycle between authoritative Zustand state and Phaser. */
export class ArenaStateSystem {
  private unsubscriptions: Array<() => void> = [];

  get snapshot(): ArenaStoreSnapshot {
    return arenaStoreAdapter.getState();
  }

  get gameState(): GameState | undefined {
    return this.snapshot.gameState;
  }

  start(onStateInvalidated: () => void) {
    this.stop();
    this.unsubscriptions = [
      arenaEventAdapter.on("UPDATE_SLOTS", onStateInvalidated),
      arenaEventAdapter.on("CAMERA_CHANGE", onStateInvalidated),
    ];
  }

  stop() {
    this.unsubscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
  }
}
