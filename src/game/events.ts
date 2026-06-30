import { PlayerId, SpellTarget } from "./types";

export type GameEventType =
  | "GAME_STARTED"
  | "ROUND_STARTED"
  | "ROUND_ENDED"
  | "TURN_STARTED"
  | "TURN_ENDED"
  | "CARD_PLAYED"
  | "CARD_DRAWN"
  | "CARD_DISCARDED"
  | "SPELL_CAST"
  | "UNIT_SUMMONED"
  | "ATTACK_DECLARED"
  | "BLOCK_DECLARED"
  | "UNIT_STRUCK"
  | "UNIT_DAMAGED"
  | "UNIT_HEALED"
  | "UNIT_DIED"
  | "NEXUS_DAMAGED"
  | "CHAMPION_LEVELED_UP";

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
