import { useGameStore } from "../../../../hooks/useGameStore";
import type { ArenaEntityRef, CameraPreset } from "../../../../hooks/useGameStore";
import type { GameState, PlayerId } from "@backend/game/types";

/**
 * Imperative bridge for Phaser. Phaser must not call React hooks directly;
 * these functions expose the Zustand store safely outside React components.
 */
export const arenaStoreAdapter = {
  getState: () => useGameStore.getState(),

  subscribe(listener: () => void) {
    return useGameStore.subscribe(listener);
  },

  syncGameState(gameState: GameState, viewerPlayerId: PlayerId) {
    useGameStore.getState().syncGameState(gameState, viewerPlayerId);
  },

  selectEntity(entity?: ArenaEntityRef) {
    useGameStore.getState().setSelectedEntity(entity);
  },

  hoverEntity(entity?: ArenaEntityRef) {
    useGameStore.getState().setHoveredEntity(entity);
  },

  setCamera(camera: Partial<{ preset: CameraPreset; tilt: number; zoom: number }>) {
    useGameStore.getState().setCamera(camera);
  },
};

export type ArenaStoreSnapshot = ReturnType<typeof arenaStoreAdapter.getState>;
