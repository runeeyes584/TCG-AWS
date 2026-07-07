import type { GameAction, GameState, PlayerId } from "../game/types";

export interface ClientToServerEvents {
  "room:create": (ack: RoomAck) => void;
  "room:join": (roomCode: string, ack: RoomAck) => void;
  "game:action": (action: GameAction, ack?: ActionAck) => void;
  "game:reset": (ack?: ActionAck) => void;
}

export interface ServerToClientEvents {
  "room:update": (payload: RoomUpdate) => void;
  "game:error": (message: string) => void;
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

export interface RoomUpdate {
  roomCode: string;
  playerId: PlayerId;
  opponentConnected: boolean;
  state: GameState;
  log: Array<{ id: number; message: string }>;
}
