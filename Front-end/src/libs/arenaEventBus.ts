import type { GameState, GraveyardCause, PlayerId, SpellTargetKind } from "@backend/game/types";
import type { GraveyardChangeKind } from "../components/game/hud/graveyard/graveyardChanges";
import type { PassSealState } from "../components/game/hud/passButton/passSeal";
import type { PilesState } from "../components/game/hud/piles/pileState";

/** A rectangle in viewport (client) pixels. */
export interface ScreenRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ArenaEventMap = {
  UPDATE_SLOTS: { gameState: GameState; viewerPlayerId: PlayerId };
  SUMMON_UNIT: { unitId: string };
  /**
   * The attack or the blocks were committed (`unitIds`: the attackers, or the blockers). One of the few
   * moments that shake the screen; declaring an ordinary unit only makes its card glide up.
   */
  COMMIT_CUE: { kind: "attack" | "defend"; unitIds: string[] };
  /** A champion was declared into a lane: the other moment that shakes the screen. */
  CHAMPION_DECLARED: { unitId: string };
  DESTROY_UNIT: { unitId: string };
  /** `anchor` is where the card is on screen, so the inspector can stand beside it. */
  HOVER_UNIT: { playerId: PlayerId; unitId: string; anchor: ScreenRect } | undefined;
  SELECT_UNIT: { playerId: PlayerId; unitId: string };
  /** A card on the table was right-clicked: pin it, so the codex shows its full text. */
  INSPECT_UNIT: { playerId: PlayerId; unitId: string };
  EMPTY_SLOT_CLICK: { playerId: PlayerId; index: number };
  /** The card the player has picked on the table to declare next (a blocker waiting for its lane); none when nothing is picked. */
  UNIT_PICKED: { unitId?: string };
  TARGETING_CHANGED: {
    targetKind: Extract<SpellTargetKind, "ALLY_UNIT" | "ENEMY_UNIT"> | undefined;
    playerId?: PlayerId;
  };
  CAMERA_CHANGE: { preset: "dynamic" | "top-down" | "cinematic"; tilt: number; zoom: number };
  /**
   * The pass / attack / defend seal: its state and where its DOM button is on screen. The DOM
   * button keeps the click, focus and rules; Phaser draws it. `undefined` hides the seal.
   */
  PASS_SEAL: ({ rect: ScreenRect } & PassSealState) | undefined;
  /** Who acts now (the rift glows in their colour all turn long), or `undefined` before the match starts and after it ends. */
  TURN_OWNER: "you" | "opponent" | undefined;
  /**
   * The turn changed hands: the rift flares in the colour of whoever acts now and, in `full` mode,
   * `YOUR TURN` / `ENEMY TURN` rises out of it from that player's side of the table (about 1 s).
   * `flash` is the quiet version for turns that change in quick succession.
   */
  TURN_BANNER: { owner: "you" | "opponent"; mode: "full" | "flash" };
  /**
   * The four piles (the decks and the graveyards): what each holds and whether the pointer is on it. The DOM buttons
   * take the pointer and report this; Phaser paints the piles where `pileLayout` puts them. `undefined` hides them.
   */
  PILES_STATE: PilesState | undefined;
  /**
   * Something happened to a graveyard: a card fell in (`ENTER`), returned to the table (`REVIVE`) or to the hand
   * (`REBIRTH`) or was exiled (`BANISH`). The DOM knows where the pile and the hand are (`pile`, `hand`); Phaser draws
   * the soul between them, or to the card of the revived unit (`unitId`), `delayMs` after the event.
   */
  GRAVEYARD_FX: {
    kind: GraveyardChangeKind;
    /** Whose graveyard it is, as seen from here: the player's own, or the opponent's. */
    tone: "viewer" | "opponent";
    pile: ScreenRect;
    cause?: GraveyardCause;
    unitId?: string;
    hand?: ScreenRect;
    delayMs: number;
  };
  /**
   * Left-over mana turns into spell mana at the start of a round: each `store` step flies a gem
   * from the mana track to a spell shard, a `dissolve` step turns a gem that no longer fits to dust.
   * The rects are where those DOM gems and shards are on screen.
   */
  NEXUS_CARRY: {
    tone: "viewer" | "opponent";
    steps: Array<{ kind: "store"; from: ScreenRect; to: ScreenRect } | { kind: "dissolve"; from: ScreenRect }>;
  };
};

type Listener<T> = (payload: T) => void;

/**
 * Event bridge between React and Phaser.
 * React owns the rules, WebSocket state, and game logic;
 * this bus is for presentation events and user interactions on the canvas.
 */
class ArenaEventBus {
  private listeners = new Map<keyof ArenaEventMap, Set<Listener<unknown>>>();
  private latestPayloads = new Map<keyof ArenaEventMap, unknown>();

  on<K extends keyof ArenaEventMap>(event: K, listener: Listener<ArenaEventMap[K]>) {
    const eventListeners = this.listeners.get(event) ?? new Set<Listener<unknown>>();
    eventListeners.add(listener as Listener<unknown>);
    this.listeners.set(event, eventListeners);
    return () => {
      eventListeners.delete(listener as Listener<unknown>);
    };
  }

  /** The last payload emitted for `event`, for a subscriber that starts after it was sent (Phaser loads late). */
  latest<K extends keyof ArenaEventMap>(event: K): ArenaEventMap[K] | undefined {
    return this.latestPayloads.get(event) as ArenaEventMap[K] | undefined;
  }

  emit<K extends keyof ArenaEventMap>(event: K, payload: ArenaEventMap[K]) {
    this.latestPayloads.set(event, payload);
    const eventListeners = this.listeners.get(event);
    if (!eventListeners || eventListeners.size === 0) return;
    Array.from(eventListeners).forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[ArenaEventBus] Listener failed for event "${String(event)}":`, error);
      }
    });
  }

  clear() {
    this.listeners.clear();
    this.latestPayloads.clear();
  }
}

export const arenaEventBus = new ArenaEventBus();
