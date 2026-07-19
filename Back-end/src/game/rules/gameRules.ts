import {
  getCardDefinitionForInstance,
  getUnitHealth,
  isUnitCard
} from "../entities/cards";
import {
  AdditionalCostDefinition,
  CardInstance,
  CardDefinition,
  GameAction,
  GameState,
  GameValidationError,
  PlayerId,
  PlayerState,
  SpellEffect,
  SpellTarget,
  UnitInstance
} from "../types";

export const PLAYER_IDS: PlayerId[] = ["P1", "P2"];
export const STARTING_NEXUS_HP = 20;
export const MAX_MANA = 10;
export const MAX_SPELL_MANA = 3;
export const STARTING_HAND_SIZE = 4;
export const HAND_LIMIT = 6;
export const BOARD_LIMIT = 6;

export function validateAction(state: GameState, action: GameAction): void {
  if (state.winnerId) {
    throw new GameValidationError("Cannot apply actions after the game is won.");
  }

  if (action.type !== "START_GAME" && !state.started) {
    throw new GameValidationError("Game has not started.");
  }

  if (
    state.phase === "DISCARD" &&
    action.type !== "DISCARD_CARD" &&
    action.type !== "TIME_OUT" &&
    action.type !== "SURRENDER"
  ) {
    throw new GameValidationError("Discard cards until your hand has 6 cards.");
  }

  if (
    state.pendingChoice &&
    action.type !== "SUBMIT_ABILITY_TARGETS" &&
    action.type !== "CANCEL_PENDING_CHOICE" &&
    action.type !== "TIME_OUT" &&
    action.type !== "SURRENDER"
  ) {
    throw new GameValidationError("Resolve the pending ability choice first.");
  }

  switch (action.type) {
    case "START_GAME":
      if (state.started) {
        throw new GameValidationError("Game has already started.");
      }
      if (action.firstPlayerId && !isPlayerId(action.firstPlayerId)) {
        throw new GameValidationError("Invalid first player.");
      }
      return;
    case "DRAW_CARD":
      assertPlayer(action.playerId);
      if ((action.count ?? 1) < 1) {
        throw new GameValidationError("Draw count must be positive.");
      }
      return;
    case "DISCARD_CARD":
      assertDiscardCard(state, action.playerId, action.cardInstanceId);
      return;
    case "START_ROUND":
      assertPhase(state, "ACTION");
      return;
    case "PLAY_UNIT":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      assertBoardSpace(state.players[action.playerId], action.replaceUnitId);
      assertPlayableUnit(state, action.playerId, action.cardInstanceId);
      assertAdditionalCostTargets(
        state,
        action.playerId,
        getCardDefinitionForInstance(assertCardInHand(state, action.playerId, action.cardInstanceId)),
        action.costTargets
      );
      return;
    case "PLAY_SPELL":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      assertPlayableSpell(state, action.playerId, action.cardInstanceId, action.target);
      assertAdditionalCostTargets(
        state,
        action.playerId,
        getCardDefinitionForInstance(assertCardInHand(state, action.playerId, action.cardInstanceId)),
        action.costTargets
      );
      return;
    case "SUBMIT_ABILITY_TARGETS":
      assertPendingChoicePlayer(state, action.playerId);
      return;
    case "CANCEL_PENDING_CHOICE":
      assertPendingChoicePlayer(state, action.playerId);
      return;
    case "DECLARE_ATTACKER":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      if (state.attackTokenPlayerId !== action.playerId) {
        throw new GameValidationError("Player does not have the attack token.");
      }
      if (!state.attackTokenAvailable) {
        throw new GameValidationError("Attack token has already been used.");
      }
      assertUnitCanAttack(state, action.playerId, action.unitInstanceId);
      return;
    case "REMOVE_ATTACKER":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      if (state.attackTokenPlayerId !== action.playerId) {
        throw new GameValidationError("Player does not have the attack token.");
      }
      assertCombatAttackerExists(state, action.unitInstanceId);
      return;
    case "COMMIT_ATTACK":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      if (state.attackTokenPlayerId !== action.playerId) {
        throw new GameValidationError("Only the attacker can commit attacks.");
      }
      if (!state.attackTokenAvailable) {
        throw new GameValidationError("Attack token has already been used.");
      }
      if (!hasAttackers(state)) {
        throw new GameValidationError("No attackers declared.");
      }
      return;
    case "DECLARE_BLOCKER":
      assertPhase(state, "BLOCK");
      assertPriority(state, action.playerId);
      if (opponentOf(state.attackTokenPlayerId) !== action.playerId) {
        throw new GameValidationError("Only the defending player can block.");
      }
      assertUnitCanBlock(state, action.playerId, action.blockerId);
      assertCombatAttackerCanBeBlocked(state, action.attackerId);
      return;
    case "REMOVE_BLOCKER":
      assertPhase(state, "BLOCK");
      assertPriority(state, action.playerId);
      if (opponentOf(state.attackTokenPlayerId) !== action.playerId) {
        throw new GameValidationError("Only the defending player can remove blockers.");
      }
      assertAssignedBlocker(state, action.blockerId);
      return;
    case "COMMIT_BLOCKS":
      assertPhase(state, "BLOCK");
      assertPriority(state, action.playerId);
      if (opponentOf(state.attackTokenPlayerId) !== action.playerId) {
        throw new GameValidationError("Only the defending player can commit blocks.");
      }
      return;
    case "RESOLVE_COMBAT":
      assertPhase(state, "COMBAT");
      if (!hasAttackers(state)) {
        throw new GameValidationError("No attackers declared.");
      }
      return;
    case "END_TURN":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      return;
    case "TIME_OUT":
      assertPriority(state, action.playerId);
      return;
    case "SURRENDER":
      assertPlayer(action.playerId);
      return;
  }
}

function assertAdditionalCostTargets(
  state: GameState,
  playerId: PlayerId,
  definition: CardDefinition,
  costTargets?: SpellTarget[]
): void {
  const cost = definition.additionalCost;
  if (!cost) {
    if (costTargets?.length) {
      throw new GameValidationError("Card does not require additional cost targets.");
    }
    return;
  }

  switch (cost.type) {
    case "SACRIFICE_UNITS":
      assertSacrificeUnitCostTargets(state, playerId, cost, costTargets);
      return;
  }
}

function assertSacrificeUnitCostTargets(
  state: GameState,
  playerId: PlayerId,
  cost: AdditionalCostDefinition & { type: "SACRIFICE_UNITS" },
  costTargets?: SpellTarget[]
): void {
  if (!costTargets || costTargets.length !== cost.count) {
    throw new GameValidationError(`Additional cost requires ${cost.count} allied unit(s).`);
  }

  const seen = new Set<string>();
  for (const target of costTargets) {
    if (target.type !== "UNIT" || target.playerId !== playerId) {
      throw new GameValidationError("Additional cost requires allied unit targets.");
    }
    if (seen.has(target.unitId)) {
      throw new GameValidationError("Additional cost targets must be unique.");
    }
    seen.add(target.unitId);
    findUnit(state, playerId, target.unitId);
  }
}

export function checkWinConditions(state: GameState): GameState {
  if (state.winnerId) {
    return state;
  }

  const p1Dead = state.players.P1.nexusHp <= 0;
  const p2Dead = state.players.P2.nexusHp <= 0;

  if (p1Dead && p2Dead) {
    state.winnerId = state.priorityPlayerId;
  } else if (p1Dead) {
    state.winnerId = "P2";
  } else if (p2Dead) {
    state.winnerId = "P1";
  }

  return state;
}

export function findUnit(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): UnitInstance {
  const unit = state.players[playerId].board.find(
    (candidate) => candidate.instanceId === unitInstanceId
  );
  if (!unit) {
    throw new GameValidationError("Unit is not on board.");
  }
  return unit;
}

export function findCardInHand(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): CardInstance {
  const card = state.players[playerId].hand.find(
    (candidate) => candidate.instanceId === cardInstanceId
  );
  if (!card) {
    throw new GameValidationError("Card is not in hand.");
  }
  return card;
}

export function getAttackers(state: GameState): UnitInstance[] {
  return state.combat.attackers.map((lane) =>
    findUnit(state, state.attackTokenPlayerId, lane.attackerId)
  );
}

export function opponentOf(playerId: PlayerId): PlayerId {
  return playerId === "P1" ? "P2" : "P1";
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    effectQueue: state.effectQueue.map((queuedEffect) => ({
      ...queuedEffect,
      target: queuedEffect.target ? { ...queuedEffect.target } : undefined
    })),
    visualEvents: state.visualEvents.map((event) => ({ ...event })),
    pendingDiscard: state.pendingDiscard
      ? {
          ...state.pendingDiscard,
          remainingPlayerIds: state.pendingDiscard.remainingPlayerIds
            ? [...state.pendingDiscard.remainingPlayerIds]
            : undefined
        }
      : undefined,
    pendingChoice: state.pendingChoice
      ? {
          ...state.pendingChoice,
          requiredTargets: state.pendingChoice.requiredTargets.map((target) => ({ ...target })),
          chosenTargets: cloneAbilityTargetMap(state.pendingChoice.chosenTargets),
          costTargets: state.pendingChoice.costTargets?.map((target) => ({ ...target })),
          playUnit: state.pendingChoice.playUnit
            ? {
                ...state.pendingChoice.playUnit,
                costTargets: state.pendingChoice.playUnit.costTargets?.map((target) => ({ ...target }))
              }
            : undefined
        }
      : undefined,
    combat: {
      attackers: state.combat.attackers.map((lane) => ({ ...lane }))
    },
    players: {
      P1: clonePlayer(state.players.P1),
      P2: clonePlayer(state.players.P2)
    }
  };
}

function assertPlayer(playerId: PlayerId): void {
  if (!isPlayerId(playerId)) {
    throw new GameValidationError("Invalid player.");
  }
}

function assertPriority(state: GameState, playerId: PlayerId): void {
  assertPlayer(playerId);
  if (state.priorityPlayerId !== playerId) {
    throw new GameValidationError("Player does not have priority.");
  }
}

function assertPhase(state: GameState, phase: GameState["phase"]): void {
  if (state.phase !== phase) {
    throw new GameValidationError(`Action is not allowed during ${state.phase}.`);
  }
}

function assertPendingChoicePlayer(state: GameState, playerId: PlayerId): void {
  assertPlayer(playerId);
  if (!state.pendingChoice) {
    throw new GameValidationError("No ability choice is pending.");
  }
  if (state.pendingChoice.playerId !== playerId) {
    throw new GameValidationError("Only the pending player can submit ability targets.");
  }
}

function assertDiscardCard(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): void {
  assertPlayer(playerId);
  if (state.phase !== "DISCARD" || !state.pendingDiscard) {
    throw new GameValidationError("No discard is pending.");
  }
  if (state.pendingDiscard.playerId !== playerId) {
    throw new GameValidationError("Only the pending player can discard.");
  }
  if (state.players[playerId].hand.length <= state.pendingDiscard.downTo) {
    throw new GameValidationError("Hand is already within the limit.");
  }
  assertCardInHand(state, playerId, cardInstanceId);
}

function assertBoardSpace(player: PlayerState, replaceUnitId?: string): void {
  if (player.board.length >= BOARD_LIMIT) {
    if (!replaceUnitId) {
      throw new GameValidationError("Board is full. You must replace a unit.");
    }
    const unitToReplace = player.board.find(u => u.instanceId === replaceUnitId);
    if (!unitToReplace) {
      throw new GameValidationError("Unit to replace not found on board.");
    }
  } else if (replaceUnitId) {
    throw new GameValidationError("Cannot replace a unit when the board is not full.");
  }
}

function assertCardInHand(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): CardInstance {
  const card = state.players[playerId].hand.find(
    (candidate) => candidate.instanceId === cardInstanceId
  );
  if (!card) {
    throw new GameValidationError("Card is not in hand.");
  }
  return card;
}

function assertPlayableUnit(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): void {
  const player = state.players[playerId];
  const card = assertCardInHand(state, playerId, cardInstanceId);
  const definition = getCardDefinitionForInstance(card);
  if (!isUnitCard(definition)) {
    throw new GameValidationError("Card is not a unit or champion.");
  }
  if (definition.attack === undefined || definition.health === undefined) {
    throw new GameValidationError("Unit card requires attack and health.");
  }
  if (player.mana < definition.cost) {
    throw new GameValidationError("Not enough mana.");
  }
}

function assertPlayableSpell(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  target: SpellTarget
): void {
  const player = state.players[playerId];
  const card = assertCardInHand(state, playerId, cardInstanceId);
  const definition = getCardDefinitionForInstance(card);
  if (definition.type !== "spell") {
    throw new GameValidationError("Card is not a spell.");
  }
  if (!definition.effects?.length && !definition.abilities?.length) {
    throw new GameValidationError("Spell card requires at least one effect.");
  }
  if (player.mana + player.spellMana < definition.cost) {
    throw new GameValidationError("Not enough mana.");
  }

  for (const effect of definition.effects ?? []) {
    assertSpellTarget(state, playerId, effect, target);
  }
}

function assertSpellTarget(
  state: GameState,
  casterId: PlayerId,
  effect: SpellEffect,
  target: SpellTarget
): void {
  switch (effect.target) {
    case "SOURCE":
    case "EVENT_UNIT":
    case "ALLY_NEXUS":
    case "ENEMY_NEXUS":
    case "RANDOM_ENEMY_UNIT":
    case undefined:
      return;
    case "RECALL_UNIT":
      if (target.type !== "UNIT" || target.playerId !== casterId) {
        throw new GameValidationError("Spell requires an ally unit target.");
      }
      findUnit(state, target.playerId, target.unitId);
      return;
    case "ENEMY_UNIT":
      if (target.type !== "UNIT" || target.playerId !== opponentOf(casterId)) {
        throw new GameValidationError("Spell requires an enemy unit target.");
      }
      findUnit(state, target.playerId, target.unitId);
      return;
    case "ALLY_UNIT":
      if (target.type !== "UNIT" || target.playerId !== casterId) {
        throw new GameValidationError("Spell requires an ally unit target.");
      }
      findUnit(state, target.playerId, target.unitId);
      return;
    case "NEXUS":
      if (target.type !== "NEXUS") {
        throw new GameValidationError("Spell requires a nexus target.");
      }
      assertPlayer(target.playerId);
      return;
    case "SELF":
      return;
    case "ALLY_GRAVEYARD":
      if (target.type !== "GRAVEYARD" || target.playerId !== casterId) {
        throw new GameValidationError("Spell requires an ally graveyard target.");
      }
      if (target.cardInstanceId) {
        const card = state.players[casterId].graveyard.find(c => c.instanceId === target.cardInstanceId);
        if (!card) throw new GameValidationError("Target card not found in ally graveyard.");
      }
      return;
    case "ENEMY_GRAVEYARD":
      if (target.type !== "GRAVEYARD" || target.playerId !== opponentOf(casterId)) {
        throw new GameValidationError("Spell requires an enemy graveyard target.");
      }
      if (target.cardInstanceId) {
        const card = state.players[opponentOf(casterId)].graveyard.find(c => c.instanceId === target.cardInstanceId);
        if (!card) throw new GameValidationError("Target card not found in enemy graveyard.");
      }
      return;
  }
}

function assertUnitCanAttack(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): void {
  const unit = findUnit(state, playerId, unitInstanceId);
  if (getUnitHealth(unit) <= 0) {
    throw new GameValidationError("Attacker must be alive.");
  }
  if (unit.exhausted) {
    throw new GameValidationError("Unit is exhausted.");
  }
  if (state.combat.attackers.some((lane) => lane.attackerId === unitInstanceId)) {
    throw new GameValidationError("Unit is already attacking.");
  }
}

function assertUnitCanBlock(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): void {
  const unit = findUnit(state, playerId, unitInstanceId);
  if (getUnitHealth(unit) <= 0) {
    throw new GameValidationError("Blocker must be alive.");
  }
  if (state.combat.attackers.some((lane) => lane.blockerId === unitInstanceId)) {
    throw new GameValidationError("Unit is already blocking.");
  }
}

function assertCombatAttackerCanBeBlocked(state: GameState, attackerId: string): void {
  const lane = state.combat.attackers.find(
    (candidate) => candidate.attackerId === attackerId
  );
  if (!lane) {
    throw new GameValidationError("Attacker is not in the attack lineup.");
  }
  findUnit(state, state.attackTokenPlayerId, attackerId);
  if (lane.blockerId) {
    throw new GameValidationError("Attacker is already blocked.");
  }
}

function assertCombatAttackerExists(state: GameState, attackerId: string): void {
  if (!state.combat.attackers.some((lane) => lane.attackerId === attackerId)) {
    throw new GameValidationError("Attacker is not in the attack lineup.");
  }
  findUnit(state, state.attackTokenPlayerId, attackerId);
}

function assertAssignedBlocker(state: GameState, blockerId: string): void {
  if (!state.combat.attackers.some((lane) => lane.blockerId === blockerId)) {
    throw new GameValidationError("Unit is not assigned as a blocker.");
  }
}

function assertCombatIndex(index: number, laneCount: number, allowAppend: boolean): void {
  const upperBound = allowAppend ? laneCount : laneCount - 1;
  if (!Number.isInteger(index) || index < 0 || index > upperBound || index >= BOARD_LIMIT) {
    throw new GameValidationError("Combat position is outside the available lanes.");
  }
}

function hasAttackers(state: GameState): boolean {
  return state.combat.attackers.length > 0;
}

function isPlayerId(playerId: string): playerId is PlayerId {
  return playerId === "P1" || playerId === "P2";
}

function clonePlayer(player: PlayerState): PlayerState {
  return {
    ...player,
    deck: player.deck.map(cloneCard),
    hand: player.hand.map(cloneCard),
    board: player.board.map((unit) => ({
      ...unit,
      keywords: [...unit.keywords],
      temporaryKeywords: [...(unit.temporaryKeywords ?? [])],
      modifiers: unit.modifiers.map((modifier) => ({ ...modifier }))
    } as UnitInstance)),
    graveyard: player.graveyard.map((entry) => ({ ...entry })),
    championProgress: { ...(player.championProgress ?? {}) },
    leveledChampionIds: { ...(player.leveledChampionIds ?? {}) },
    abilityProgress: { ...(player.abilityProgress ?? {}) }
  };
}

function cloneCard(card: CardInstance): CardInstance {
  return {
    ...card,
    cardId: card.cardId
  };
}

function cloneAbilityTargetMap(
  targets: import("../types").AbilityTargetMap
): import("../types").AbilityTargetMap {
  return Object.fromEntries(
    Object.entries(targets).map(([key, target]) => [key, { ...target }])
  );
}
