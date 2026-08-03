import type { GameState, PlayerId } from "@backend/game/types";

export type ArenaEventMap = {
  UPDATE_SLOTS: { gameState: GameState; viewerPlayerId: PlayerId };
  SUMMON_UNIT: { unitId: string };
  ATTACK_UNIT: { unitId: string };
  DESTROY_UNIT: { unitId: string };
  HOVER_UNIT: { playerId: PlayerId; unitId: string } | undefined;
  SELECT_UNIT: { playerId: PlayerId; unitId: string };
  EMPTY_SLOT_CLICK: { playerId: PlayerId; index: number };
  CAMERA_CHANGE: { preset: "dynamic" | "top-down" | "cinematic"; tilt: number; zoom: number };
};

type Listener<T> = (payload: T) => void;

/**
 * Event bridge between React and Phaser.
 * React owns the rules, WebSocket state, and game logic;
 * this bus is for presentation events and user interactions on the canvas.
 */
class ArenaEventBus {
  private listeners = new Map<keyof ArenaEventMap, Set<Listener<unknown>>>();

  on<K extends keyof ArenaEventMap>(event: K, listener: Listener<ArenaEventMap[K]>) {
    const eventListeners = this.listeners.get(event) ?? new Set<Listener<unknown>>();
    eventListeners.add(listener as Listener<unknown>);
    this.listeners.set(event, eventListeners);
    return () => {
      eventListeners.delete(listener as Listener<unknown>);
    };
  }

  emit<K extends keyof ArenaEventMap>(event: K, payload: ArenaEventMap[K]) {
    this.listeners.get(event)?.forEach((listener) => listener(payload));
  }
}

export const arenaEventBus = new ArenaEventBus();
