import type { GameAction, GameState, PlayerId } from "../game/types";

export interface ClientToServerEvents {
  "room:create": (selection: MatchmakingDeckSelection | undefined, ack: RoomAck) => void;
  "room:join": (roomCode: string, selection: MatchmakingDeckSelection | undefined, ack: RoomAck) => void;
  "game:action": (action: GameAction, ack?: ActionAck) => void;
  "game:reset": (ack?: ActionAck) => void;
  "developer:resources": (updates: DeveloperResourceUpdate[], ack?: ActionAck) => void;
  "matchmaking:start": (selection?: MatchmakingDeckSelection) => void;
  "matchmaking:cancel": () => void;
}

export interface MatchmakingDeckSelection {
  deckId?: string;
  cardIds?: string[];
}

export interface DeveloperResourceUpdate {
  playerId: PlayerId;
  mana: number;
  spellMana: number;
}

/**
 * Why a connection is pushed out: `tab` when the same sign-in is now used from another tab or window, `device` when
 * a later sign-in on another browser or device replaced it (see session/connectionEviction.ts).
 */
export type SessionReplacedReason = "tab" | "device";

export interface SessionReplacedPayload {
  reason: SessionReplacedReason;
}

export interface ServerToClientEvents {
  "room:update": (payload: RoomUpdate) => void;
  "room:created"?: (payload: Partial<RoomUpdate>) => void;
  "game:error": (message: string) => void;
  "session:replaced": (payload: SessionReplacedPayload) => void;
  "matchmaking:searching": () => void;
  "matchmaking:cancelled": () => void;
  "matchmaking:found": (payload?: Partial<RoomUpdate>) => void;
}

export interface RoomAckPayload {
  ok: true;
  roomCode: string;
  playerId: PlayerId;
}

export interface ErrorAckPayload {
  ok: false;
  error: string;
}

export type RoomAck = (payload: RoomAckPayload | ErrorAckPayload) => void;
export type ActionAck = (payload: { ok: true } | ErrorAckPayload) => void;

export interface MatchPlayerProfile {
  username: string;
  avatar?: string;
  elo: number;
}

export interface RoomUpdate {
  roomCode: string;
  playerId: PlayerId;
  opponentConnected: boolean;
  players: Partial<Record<PlayerId, MatchPlayerProfile>>;
  state: GameState;
  log: Array<{ id: number; message: string }>;
  /** The server clock when the message was sent, so a browser can correct its own clock against it. */
  serverTime?: number;
}
