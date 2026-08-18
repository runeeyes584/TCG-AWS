import { create } from "zustand";
import type { GameState, PlayerId } from "@backend/game/types";

export type CameraPreset = "dynamic" | "top-down" | "cinematic";

export interface ArenaEntityRef {
  playerId: PlayerId;
  unitId: string;
}

interface GameBridgeState {
  gameState?: GameState;
  viewerPlayerId: PlayerId;
  selectedEntity?: ArenaEntityRef;
  hoveredEntity?: ArenaEntityRef;
  targetingLine?: { start: { x: number; y: number }; end: { x: number; y: number } };
  camera: { preset: CameraPreset; tilt: number; zoom: number };
  syncGameState: (gameState: GameState, viewerPlayerId: PlayerId) => void;
  setSelectedEntity: (entity?: ArenaEntityRef) => void;
  setHoveredEntity: (entity?: ArenaEntityRef) => void;
  setTargetingLine: (line?: GameBridgeState["targetingLine"]) => void;
  setCamera: (camera: Partial<GameBridgeState["camera"]>) => void;
}

/** Shared, non-authoritative state for React HUD and Phaser presentation. */
export const useGameStore = create<GameBridgeState>((set) => ({
  viewerPlayerId: "P1",
  // Hybrid top/3D default: enough perspective for depth without hiding lanes.
  camera: { preset: "dynamic", tilt: 0.24, zoom: 1 },
  syncGameState: (gameState, viewerPlayerId) => set({ gameState, viewerPlayerId }),
  setSelectedEntity: (selectedEntity) => set({ selectedEntity }),
  setHoveredEntity: (hoveredEntity) => set({ hoveredEntity }),
  setTargetingLine: (targetingLine) => set({ targetingLine }),
  setCamera: (camera) => set((state) => ({ camera: { ...state.camera, ...camera } }))
}));
