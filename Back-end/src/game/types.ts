import { GameEventType, GameEvent } from "./events";

export type PlayerId = "P1" | "P2";

export type CardType = "unit" | "spell" | "champion";

export type GamePhase = "ACTION" | "BLOCK" | "COMBAT" | "DISCARD";

export type Keyword = "TOUGH" | "BARRIER" | "QUICK_ATTACK" | "OVERWHELM";

export type SpellSpeed = "burst" | "fast" | "slow";

export type SpellTargetKind = "ENEMY_UNIT" | "ALLY_UNIT" | "NEXUS" | "SELF" | "ALLY_GRAVEYARD" | "ENEMY_GRAVEYARD";

export type AdditionalCostDefinition =
  | { type: "SACRIFICE_UNITS"; count: number };

export type TriggerTargetKind =
  | "EVENT_UNIT"
  | "SOURCE"
  | "ALLY_NEXUS"
  | "ENEMY_NEXUS"
  | "RANDOM_ENEMY_UNIT";

export type AbilityTargetKind =
  | "SELF"
  | "ALLY_UNIT"
  | "ENEMY_UNIT"
  | "ANY_UNIT"
  | "ALLY_NEXUS"
  | "ENEMY_NEXUS"
  | "ANY_TARGET"
  | "ALLY_DECK_CARD"
  | "ANY_DECK_CARD"
  | "ALLY_HAND_CARD"
  | "ENEMY_HAND_CARD"
  | "ANY_HAND_CARD";

export type ModifierDuration =
  | "PERMANENT"
  | "THIS_ROUND"
  | "THIS_TURN"
  | "UNTIL_COMBAT_END";

export interface UnitModifier {
  id: string;
  sourceCardId: string;
  sourceName: string;
  type: "BUFF" | "DEBUFF";
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
      target: SpellTargetKind | TriggerTargetKind | string;
    }
  | {
      type: "HEAL";
      amount: number;
      target: SpellTargetKind | TriggerTargetKind | string;
    }
  | {
      type: "DRAW_CARD";
      count: number;
      target: "SELF" | string;
    }
  | {
      type: "DISCARD_CARD";
      count?: number;
      target: "SELF" | string;
    }
  | {
      type: "BUFF_UNIT";
      attack: number;
      health: number;
      target: "ALLY_UNIT" | "ENEMY_UNIT" | "SELF" | TriggerTargetKind | string;
      duration?: ModifierDuration;
    }
  | {
      type: "BUFF_ACTIVE_ALLIES";
      attack: number;
      health: number;
      target?: "SELF" | string;
      duration?: ModifierDuration;
    }
  | {
      type: "DEBUFF_UNIT";
      attackDelta: number;
      healthDelta: number;
      target: "ALLY_UNIT" | "ENEMY_UNIT" | TriggerTargetKind | string;
      duration?: ModifierDuration;
    }
  | {
      type: "BURN_ACTIVE_ENEMIES";
      amount: number;
      target?: "ENEMY_UNIT" | string;
    }

  | {
      type: "BANISH_GRAVEYARD";
      target: "ALLY_GRAVEYARD" | "ENEMY_GRAVEYARD" | string;
    }
  | {
      type: "GRANT_KEYWORD";
      keyword: Keyword;
      target: "ALLY_UNIT" | "ENEMY_UNIT" | "SELF" | TriggerTargetKind | string;
    }
  | {
      type: "SUMMON_UNIT";
      cardDefinition: CardDefinition;
      target: "SELF" | string;
    }
  | {
      type: "RESTORE_SPELL_MANA";
      amount: number;
      target?: "SELF" | string;
    }
  | {
      type: "DRAW_CARD_BY_FILTER";
      count: number;
      cardType?: CardType;
      spellSpeed?: SpellSpeed;
      archetype?: string;
      target?: "SELF" | string;
    }
  | {
      type: "CREATE_RANDOM_CARD";
      archetype: string;
      cardType?: CardType;
      target?: "SELF" | string;
    }
  | {
      type: "SUMMON_FROM_DECK";
      archetype?: string;
      cardTypes?: CardType[];
      maxCost?: number;
      target?: "SELF" | string;
    }
  | {
      type: "SUMMON_FROM_HAND_OR_DECK";
      archetype?: string;
      cardTypes?: CardType[];
      maxCost?: number;
      target?: "SELF" | string;
    }
  | {
      type: "RECALL_UNIT";
      target: "ALLY_UNIT" | "ENEMY_UNIT" | "SELF" | TriggerTargetKind | string;
    }
  | {
      type: "REVIVE_CARD";
      target: "ALLY_GRAVEYARD" | "ENEMY_GRAVEYARD" | string;
      allowedTypes?: GraveyardEntryType[];
    };

export type SpellEffect = EffectDefinition;

export interface TriggerDefinition {
  event: GameEventType;
}

export type ConditionDefinition =
  | { type: "HAS_MANA"; amount: number }
  | { type: "HAS_CARD_IN_HAND"; count?: number }
  | { type: "ALLY_UNIT_EXISTS" }
  | { type: "SPELLS_CAST_THIS_ROUND_AT_LEAST"; count: number }
  | { type: "UNIT_DIED_THIS_GAME_AT_LEAST"; count: number }
  | { type: "NEXUS_HEALTH_BELOW"; player: "SELF" | "ENEMY"; amount: number }
  | { type: "UNIT_HAS_KEYWORD"; target: string; keyword: Keyword }
  | { type: "EVENT_PLAYER_IS"; player: "SELF" | "ENEMY" };

export interface TargetDefinition {
  id: string;
  kind: AbilityTargetKind;
  required?: boolean;
  filter?: CardFilterDefinition;
}

export interface CardFilterDefinition {
  cardType?: CardType;
  cardTypes?: CardType[];
  spellSpeed?: SpellSpeed;
  archetype?: string;
  maxCost?: number;
}

export type CostDefinition =
  | { type: "PAY_MANA"; amount: number }
  | { type: "DISCARD"; target: string }
  | { type: "SACRIFICE_UNIT"; target: string }
  | { type: "PAY_HEALTH"; amount: number }
  | { type: "DESTROY_ALLY"; target: string }
  | { type: "EXHAUST_UNIT"; target: string };

export interface Ability {
  id: string;
  onPlay?: boolean;
  when?: TriggerDefinition;
  runtimeCondition?: (state: GameState, event: GameEvent) => boolean;
  conditions?: ConditionDefinition[];
  targets?: TargetDefinition[];
  costs?: CostDefinition[];
  effects: EffectDefinition[];
}

export type Trigger = {
  id: string;
  sourceId: string;
  event: GameEventType;
  condition?: (state: GameState, event: GameEvent) => boolean;
  effects: EffectDefinition[];
};

export type LevelUpCondition = 
  | { type: "ALLIES_DIED"; threshold: number }
  | { type: "ENEMIES_DIED"; threshold: number }
  | { type: "SPELLS_CAST"; threshold: number }
  | { type: "NEXUS_DAMAGE_DEALT"; threshold: number }
  | { type: "THIS_CHAMPION_STRUCK"; threshold: number };

export interface QueuedEffect {
  sourceId: string;
  sourceName?: string;
  sourceCardId?: string;
  sourcePlayerId: PlayerId;
  effect: EffectDefinition;
  target?: SpellTarget;
}

export type AbilityTargetMap = Record<string, SpellTarget>;

export type SpellTarget =
  | { type: "UNIT"; playerId: PlayerId; unitId: string }
  | { type: "NEXUS"; playerId: PlayerId }
  | { type: "SELF"; playerId: PlayerId }
  | { type: "GRAVEYARD"; playerId: PlayerId; cardInstanceId?: string }
  | { type: "DECK_CARD"; playerId: PlayerId; cardInstanceId: string }
  | { type: "HAND_CARD"; playerId: PlayerId; cardInstanceId: string };

export interface CombatAttacker {
  attackerId: string;
  blockerId?: string;
}

export interface CombatState {
  attackers: CombatAttacker[];
}

export interface PendingChoice {
  playerId: PlayerId;
  sourceInstanceId: string;
  sourceCardId: string;
  abilityId: string;
  requiredTargets: TargetDefinition[];
  chosenTargets: AbilityTargetMap;
  returnPhase: GamePhase;
  playUnit?: {
    replaceUnitId?: string;
    costTargets?: SpellTarget[];
  };
  costTargets?: SpellTarget[];
}

export interface CardDefinition {
  id: string;
  name: string;
  cost: number;
  type: CardType;
  /**
   * Spell timing category. Missing spellSpeed is treated as "slow" for MVP rules.
   */
  spellSpeed?: SpellSpeed;
  description?: string;
  imageUrl?: string;
  archetype?: string;
  championId?: string;
  supertype?: "champion" | string;
  attack?: number;
  health?: number;
  keywords?: Keyword[];
  effects?: EffectDefinition[];
  additionalCost?: AdditionalCostDefinition;
  /**
   * @deprecated Use abilities with `when` instead.
   * Legacy triggers are normalized into abilities by cardRegistry.
   */
  triggers?: Trigger[];
  abilities?: Ability[];
  level?: 1 | 2;
  levelUpCondition?: LevelUpCondition;
  level2CardCode?: string;
  leveledUpCardId?: string;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
  ownerId: PlayerId;
}

export interface UnitInstance {
  instanceId: string;
  cardId: string;
  ownerId: PlayerId;
  attack: number;
  maxHealth: number;
  damage: number;
  keywords: Keyword[];
  temporaryKeywords: Keyword[];
  modifiers: UnitModifier[];
  exhausted: boolean;
  attacking: boolean;
  blockingUnitId?: string;
  blockedByUnitId?: string;
  triggers?: Trigger[];
}

/** Reason a card entered the graveyard. */
export type GraveyardCause =
  | "COMBAT"
  | "SPELL"
  | "EFFECT"
  | "MODIFIER_EXPIRED"
  | "DISCARD"
  | "MILL";

/** Whether the entry is a unit, spell, or champion card. */
export type GraveyardEntryType = "UNIT" | "SPELL" | "CHAMPION";

export interface GraveyardEntry {
  /** Unique graveyard-entry ID (`${instanceId}-gy`). */
  id: string;
  /** Original card/unit instance ID. */
  instanceId: string;
  cardId: string;
  ownerId: PlayerId;
  type: GraveyardEntryType;
  /** Game round when this card entered the graveyard. */
  round: number;
  cause: GraveyardCause;
  /** instanceId of the unit/spell that caused the death, if known. */
  sourceInstanceId?: string;
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
  leveledChampionIds: Record<string, boolean>;
  abilityProgress: Record<string, number>;
  consecutiveAfkCount: number;
}

export type VisualEvent =
  | { type: "DAMAGE"; targetId: string; amount: number; isNexus: boolean }
  | { type: "HEAL"; targetId: string; amount: number; isNexus: boolean }
  | { type: "DRAW"; playerId: PlayerId; count: number }
  | { type: "BUFF"; targetId: string; attackDelta: number; healthDelta: number }
  | { type: "DEBUFF"; targetId: string; attackDelta: number; healthDelta: number }
  | { type: "TRIGGER_ACTIVATED"; sourceId: string; effectName: string }
  | { type: "HAND_LIMIT_DISCARD_REQUIRED"; playerId: PlayerId; handSize: number; downTo: number }
  | { type: "CHAMPION_LEVELED_UP"; playerId: PlayerId; unitId: string; newLevel: number }
  | { type: "AFK_WARNING"; playerId: PlayerId; afkCount: number };

export interface GameState {
  players: Record<PlayerId, PlayerState>;
  activePlayerId: PlayerId;
  priorityPlayerId: PlayerId;
  attackTokenPlayerId: PlayerId;
  attackTokenAvailable: boolean;
  phase: GamePhase;
  pendingDiscard?: {
    playerId: PlayerId;
    downTo: number;
    returnPhase: Exclude<GamePhase, "DISCARD">;
    reason?: "HAND_LIMIT";
    remainingPlayerIds?: PlayerId[];
  };
  pendingChoice?: PendingChoice;
  combat: CombatState;
  round: number;
  turn: number;
  turnStartTime: number;
  turnDuration: number;
  consecutivePasses: number;
  rngSeed: number;
  started: boolean;
  winnerId?: PlayerId;
  effectQueue: QueuedEffect[];
  visualEvents: VisualEvent[];
}

export type GameAction =
  | { type: "START_GAME"; firstPlayerId?: PlayerId }
  | { type: "DRAW_CARD"; playerId: PlayerId; count?: number }
  | { type: "DISCARD_CARD"; playerId: PlayerId; cardInstanceId: string }
  | { type: "START_ROUND" }
  | { type: "PLAY_UNIT"; playerId: PlayerId; cardInstanceId: string; replaceUnitId?: string; target?: SpellTarget; costTargets?: SpellTarget[] }
  | {
      type: "PLAY_SPELL";
      playerId: PlayerId;
      cardInstanceId: string;
      target: SpellTarget;
      costTargets?: SpellTarget[];
    }
  | {
      type: "SUBMIT_ABILITY_TARGETS";
      playerId: PlayerId;
      targets: AbilityTargetMap;
    }
  | { type: "CANCEL_PENDING_CHOICE"; playerId: PlayerId }
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
  | { type: "END_TURN"; playerId: PlayerId }
  | { type: "TIME_OUT"; playerId: PlayerId };

export class GameValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GameValidationError";
  }
}

