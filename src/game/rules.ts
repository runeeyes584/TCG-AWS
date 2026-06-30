import {
  getUnitHealth
} from "./cards";
import {
  CardInstance,
  GameAction,
  GameState,
  GameValidationError,
  PlayerId,
  PlayerState,
  SpellEffect,
  SpellTarget,
  UnitInstance
} from "./types";

export const PLAYER_IDS: PlayerId[] = ["P1", "P2"];
export const STARTING_NEXUS_HP = 20;
export const MAX_MANA = 10;
export const MAX_SPELL_MANA = 3;
export const STARTING_HAND_SIZE = 4;
export const BOARD_LIMIT = 6;

export function validateAction(state: GameState, action: GameAction): void {
  if (state.winnerId) {
    throw new GameValidationError("Cannot apply actions after the game is won.");
  }

  if (action.type !== "START_GAME" && !state.started) {
    throw new GameValidationError("Game has not started.");
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
    case "START_ROUND":
      assertPhase(state, "ACTION");
      return;
    case "PLAY_UNIT":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      assertBoardSpace(state.players[action.playerId], action.replaceUnitId);
      assertPlayableUnit(state, action.playerId, action.cardInstanceId);
      return;
    case "PLAY_SPELL":
      assertPhase(state, "ACTION");
      assertPriority(state, action.playerId);
      assertPlayableSpell(state, action.playerId, action.cardInstanceId, action.target);
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
  }
}

export function checkWinConditions(state: GameState): GameState {
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
    cardRegistry: { ...state.cardRegistry },
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
  if (card.definition.type !== "unit" && card.definition.type !== "champion") {
    throw new GameValidationError("Card is not a unit or champion.");
  }
  if (card.definition.attack === undefined || card.definition.health === undefined) {
    throw new GameValidationError("Unit card requires attack and health.");
  }
  if (player.mana < card.definition.cost) {
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
  if (card.definition.type !== "spell") {
    throw new GameValidationError("Card is not a spell.");
  }
  if (!card.definition.effects?.length) {
    throw new GameValidationError("Spell card requires at least one effect.");
  }
  if (player.mana + player.spellMana < card.definition.cost) {
    throw new GameValidationError("Not enough mana.");
  }

  for (const effect of card.definition.effects) {
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
      if (target.type !== "SELF" || target.playerId !== casterId) {
        throw new GameValidationError("Spell requires self as target.");
      }
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
      modifiers: unit.modifiers.map((modifier) => ({ ...modifier }))
    })),
    graveyard: player.graveyard.map((entry) => ({ ...entry }))
  };
}

function cloneCard(card: CardInstance): CardInstance {
  return {
    ...card,
    definition: { ...card.definition }
  };
}
