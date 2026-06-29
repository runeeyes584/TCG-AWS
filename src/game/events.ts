import { PlayerId, SpellTarget } from "./types";

export type GameEventType =
  | "GAME_STARTED"
  | "ROUND_STARTED"
  | "ROUND_ENDED"
  | "TURN_STARTED"
  | "TURN_ENDED"
  | "CARD_PLAYED"
  | "SPELL_CAST"
  | "UNIT_SUMMONED"
  | "ATTACK_DECLARED"
  | "BLOCK_DECLARED"
  | "UNIT_STRUCK"
  | "UNIT_DAMAGED"
  | "UNIT_HEALED"
  | "UNIT_DIED"
  | "NEXUS_DAMAGED";

export interface GameEvent {
  type: GameEventType;
  // Common contextual payload, depending on the event
  playerId?: PlayerId;
  cardInstanceId?: string;
  unitInstanceId?: string;
  attackerId?: string;
  blockerId?: string;
  amount?: number;
  target?: SpellTarget;
}
