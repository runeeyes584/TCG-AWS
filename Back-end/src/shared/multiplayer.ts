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

export interface ServerToClientEvents {
  "room:update": (payload: RoomUpdate) => void;
  "game:error": (message: string) => void;
  "matchmaking:searching": () => void;
  "matchmaking:cancelled": () => void;
  "matchmaking:found": () => void;
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
}
