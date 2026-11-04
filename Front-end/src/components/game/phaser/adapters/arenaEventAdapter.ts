import { arenaEventBus, type ArenaEventMap } from "../../../../libs/arenaEventBus";

/** Typed eventBus facade used by Phaser systems and renderers. */
export const arenaEventAdapter = {
  on<K extends keyof ArenaEventMap>(event: K, listener: (payload: ArenaEventMap[K]) => void) {
    return arenaEventBus.on(event, listener);
  },

  /** The last payload sent for `event`: lets Phaser, which starts after React, catch up. */
  latest<K extends keyof ArenaEventMap>(event: K) {
    return arenaEventBus.latest(event);
  },

  emit<K extends keyof ArenaEventMap>(event: K, payload: ArenaEventMap[K]) {
    arenaEventBus.emit(event, payload);
  },
};

export type ArenaEventName = keyof ArenaEventMap;
