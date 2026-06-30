import { GameEventType, GameEvent } from "./events";

export type PlayerId = "P1" | "P2";

export type CardType = "unit" | "spell" | "champion";

export type GamePhase = "ACTION" | "BLOCK" | "COMBAT";

export type Keyword = "TOUGH" | "BARRIER" | "QUICK_ATTACK" | "OVERWHELM";

export type SpellTargetKind = "ENEMY_UNIT" | "ALLY_UNIT" | "NEXUS" | "SELF" | "ALLY_GRAVEYARD" | "ENEMY_GRAVEYARD";

export type TriggerTargetKind =
  | "EVENT_UNIT"
  | "SOURCE"
  | "ALLY_NEXUS"
  | "ENEMY_NEXUS"
  | "RANDOM_ENEMY_UNIT";

export type ModifierDuration =
  | "PERMANENT"
  | "THIS_ROUND"
  | "THIS_TURN"
  | "UNTIL_COMBAT_END";

export interface UnitModifier {
  id: string;
  sourceCardId: string;
  sourceName: string;
  type: "BUFF";
  attackDelta: number;
  healthDelta: number;
  duration: ModifierDuration;
  createdRound: number;
  createdTurn: number;
}

export type EffectDefinition =
  | {
      type: "DEAL_DAMAGE";
      amount: number;
      target: SpellTargetKind | TriggerTargetKind;
    }
  | {
      type: "HEAL";
      amount: number;
      target: SpellTargetKind | TriggerTargetKind;
    }
  | {
      type: "DRAW_CARD";
      count: number;
      target: "SELF";
    }
  | {
      type: "BUFF_UNIT";
      attack: number;
      health: number;
      target: "ALLY_UNIT" | "ENEMY_UNIT" | "SELF" | TriggerTargetKind;
      duration?: ModifierDuration;
    }
  | {
      type: "GRANT_KEYWORD";
      keyword: Keyword;
      target: "ALLY_UNIT" | "ENEMY_UNIT" | "SELF" | TriggerTargetKind;
    }
  | {
      type: "SUMMON_UNIT";
      cardDefinition: CardDefinition;
      target: "SELF";
    }
  | {
      type: "REVIVE_UNIT";
      target: "ALLY_GRAVEYARD" | "ENEMY_GRAVEYARD";
    };

export type SpellEffect = EffectDefinition;

export type Trigger = {
  id: string;
  sourceId: string;
  event: GameEventType;
  condition?: (state: GameState, event: GameEvent) => boolean;
  effects: EffectDefinition[];
};

export type LevelUpCondition = 
  | { type: "ALLIES_DIED"; threshold: number }
  | { type: "SPELLS_CAST"; threshold: number }
  | { type: "NEXUS_DAMAGE_DEALT"; threshold: number };

export interface QueuedEffect {
  sourceId: string;
  sourceName?: string;
  sourcePlayerId: PlayerId;
  effect: EffectDefinition;
  target?: SpellTarget;
}

export type SpellTarget =
  | { type: "UNIT"; playerId: PlayerId; unitId: string }
  | { type: "NEXUS"; playerId: PlayerId }
  | { type: "SELF"; playerId: PlayerId }
  | { type: "GRAVEYARD"; playerId: PlayerId; cardInstanceId?: string };

export interface CombatAttacker {
  attackerId: string;
  blockerId?: string;
}

export interface CombatState {
  attackers: CombatAttacker[];
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  supertype?: "champion" | string;
  attack?: number;
  health?: number;
  keywords?: Keyword[];
  effects?: EffectDefinition[];
  triggers?: Trigger[];
  level?: 1 | 2;
  levelUpCondition?: LevelUpCondition;
  leveledUpCardId?: string;
}

export interface CardInstance {
  instanceId: string;
  definition: CardDefinition;
  ownerId: PlayerId;
}

export interface UnitInstance {
  instanceId: string;
  definition: CardDefinition;
  ownerId: PlayerId;
  attack: number;
  maxHealth: number;
  damage: number;
  keywords: Keyword[];
  modifiers: UnitModifier[];
  exhausted: boolean;
  attacking: boolean;
  blockingUnitId?: string;
  blockedByUnitId?: string;
  triggers?: Trigger[];
}

export interface GraveyardEntry {
  instanceId: string;
  definition: CardDefinition;
  ownerId: PlayerId;
}

export interface PlayerState {
  id: PlayerId;
  nexusHp: number;
  mana: number;
  spellMana: number;
  maxMana: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: UnitInstance[];
  graveyard: GraveyardEntry[];
  championProgress: Record<string, number>;
}

export type VisualEvent =
  | { type: "DAMAGE"; targetId: string; amount: number; isNexus: boolean }
  | { type: "HEAL"; targetId: string; amount: number; isNexus: boolean }
  | { type: "DRAW"; playerId: PlayerId; count: number }
  | { type: "BUFF"; targetId: string; attackDelta: number; healthDelta: number }
  | { type: "TRIGGER_ACTIVATED"; sourceId: string; effectName: string }
  | { type: "CHAMPION_LEVELED_UP"; playerId: PlayerId; unitId: string; newLevel: number };

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  activePlayerId: PlayerId;
  priorityPlayerId: PlayerId;
  attackTokenPlayerId: PlayerId;
  attackTokenAvailable: boolean;
  phase: GamePhase;
  combat: CombatState;
  round: number;
  turn: number;
  consecutivePasses: number;
  rngSeed: number;
  started: boolean;
  winnerId?: PlayerId;
  effectQueue: QueuedEffect[];
  visualEvents: VisualEvent[];
  cardRegistry: Record<string, CardDefinition>;
}

export type GameAction =
  | { type: "START_GAME"; firstPlayerId?: PlayerId }
  | { type: "DRAW_CARD"; playerId: PlayerId; count?: number }
  | { type: "START_ROUND" }
  | { type: "PLAY_UNIT"; playerId: PlayerId; cardInstanceId: string }
  | {
      type: "PLAY_SPELL";
      playerId: PlayerId;
      cardInstanceId: string;
      target: SpellTarget;
    }
  | { type: "DECLARE_ATTACKER"; playerId: PlayerId; unitInstanceId: string }
  | { type: "REMOVE_ATTACKER"; playerId: PlayerId; unitInstanceId: string }
  | { type: "COMMIT_ATTACK"; playerId: PlayerId }
  | {
      type: "DECLARE_BLOCKER";
      playerId: PlayerId;
      attackerId: string;
      blockerId: string;
    }
  | { type: "REMOVE_BLOCKER"; playerId: PlayerId; blockerId: string }
  | { type: "COMMIT_BLOCKS"; playerId: PlayerId }
  | { type: "RESOLVE_COMBAT" }
  | { type: "END_TURN"; playerId: PlayerId };

export class GameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameValidationError";
  }
}
