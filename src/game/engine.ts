import {
  createUnitInstance,
  getUnitAttack,
  getUnitHealth
} from "./cards";
import {
  checkWinConditions,
  cloneState,
  findUnit,
  MAX_MANA,
  MAX_SPELL_MANA,
  opponentOf,
  PLAYER_IDS,
  STARTING_HAND_SIZE,
  STARTING_NEXUS_HP,
  validateAction
} from "./rules";
import {
  CardInstance,
  GameAction,
  GameState,
  Keyword,
  PlayerId,
  PlayerState,
  SpellEffect,
  SpellTarget,
  UnitModifier,
  UnitInstance
} from "./types";

export function createInitialPlayerState(
  id: PlayerId,
  deck: CardInstance[] = []
): PlayerState {
  return {
    id,
    nexusHp: STARTING_NEXUS_HP,
    mana: 0,
    spellMana: 0,
    maxMana: 0,
    deck,
    hand: [],
    board: [],
    graveyard: []
  };
}

export function createInitialGameState(
  p1Deck: CardInstance[] = [],
  p2Deck: CardInstance[] = [],
  rngSeed = 1
): GameState {
  return {
    players: {
      P1: createInitialPlayerState("P1", p1Deck),
      P2: createInitialPlayerState("P2", p2Deck)
    },
    activePlayerId: "P1",
    priorityPlayerId: "P1",
    attackTokenPlayerId: "P1",
    attackTokenAvailable: true,
    phase: "ACTION",
    combat: {
      attackers: []
    },
    round: 0,
    turn: 0,
    consecutivePasses: 0,
    rngSeed,
    started: false
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  validateAction(state, action);

  switch (action.type) {
    case "START_GAME":
      return startGame(state, action.firstPlayerId ?? "P1");
    case "DRAW_CARD":
      return drawCards(state, action.playerId, action.count ?? 1);
    case "START_ROUND":
      return startRound(state);
    case "PLAY_UNIT":
      return playUnit(state, action.playerId, action.cardInstanceId);
    case "PLAY_SPELL":
      return playSpell(state, action.playerId, action.cardInstanceId, action.target);
    case "DECLARE_ATTACKER":
      return declareAttacker(state, action.playerId, action.unitInstanceId);
    case "REMOVE_ATTACKER":
      return removeAttacker(state, action.playerId, action.unitInstanceId);
    case "COMMIT_ATTACK":
      return commitAttack(state, action.playerId);
    case "DECLARE_BLOCKER":
      return declareBlocker(
        state,
        action.playerId,
        action.attackerId,
        action.blockerId
      );
    case "REMOVE_BLOCKER":
      return removeBlocker(state, action.playerId, action.blockerId);
    case "COMMIT_BLOCKS":
      return commitBlocks(state, action.playerId);
    case "RESOLVE_COMBAT":
      return resolveCombat(state);
    case "END_TURN":
      return endTurn(state, action.playerId);
  }
}

function startGame(state: GameState, firstPlayerId: PlayerId): GameState {
  const next = cloneState(state);
  next.started = true;
  next.activePlayerId = firstPlayerId;
  next.priorityPlayerId = firstPlayerId;
  next.attackTokenPlayerId = firstPlayerId;
  next.attackTokenAvailable = true;
  next.phase = "ACTION";
  next.combat.attackers = [];
  next.consecutivePasses = 0;
  next.round = 1;
  next.turn = 1;

  for (const playerId of PLAYER_IDS) {
    next.players[playerId].deck = shuffleDeck(
      next.players[playerId].deck,
      next.rngSeed + (playerId === "P1" ? 101 : 202)
    );
    drawInto(next.players[playerId], STARTING_HAND_SIZE);
  }
  next.rngSeed += 1;

  refreshRound(next, false);
  return checkWinConditions(next);
}

function startRound(state: GameState): GameState {
  const next = cloneState(state);
  beginNextRound(next);
  return checkWinConditions(next);
}

function beginNextRound(state: GameState): void {
  const next = state;
  runCleanupPipeline(next, "END_ROUND");
  next.round += 1;
  next.turn = 1;
  next.attackTokenPlayerId = opponentOf(next.attackTokenPlayerId);
  next.attackTokenAvailable = true;
  next.activePlayerId = next.attackTokenPlayerId;
  next.priorityPlayerId = next.attackTokenPlayerId;
  next.phase = "ACTION";
  next.combat.attackers = [];
  next.consecutivePasses = 0;
  refreshRound(next, true);
}

function refreshRound(state: GameState, draw: boolean): void {
  for (const playerId of PLAYER_IDS) {
    const player = state.players[playerId];
    player.spellMana = Math.min(MAX_SPELL_MANA, player.spellMana + player.mana);
    player.maxMana = Math.min(MAX_MANA, player.maxMana + 1);
    player.mana = player.maxMana;
    player.board = player.board.map((unit) => ({
      ...unit,
      exhausted: false,
      attacking: false,
      blockingUnitId: undefined,
      blockedByUnitId: undefined
    }));
    if (draw) {
      drawInto(player, 1);
    }
  }
}

function drawCards(state: GameState, playerId: PlayerId, count: number): GameState {
  const next = cloneState(state);
  drawInto(next.players[playerId], count);
  return checkWinConditions(next);
}

function drawInto(player: PlayerState, count: number): void {
  for (let i = 0; i < count; i += 1) {
    const card = player.deck.shift();
    if (!card) {
      player.nexusHp = 0;
      return;
    }
    player.hand.push(card);
  }
}

function playUnit(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): GameState {
  const next = cloneState(state);
  const player = next.players[playerId];
  const handIndex = player.hand.findIndex(
    (card) => card.instanceId === cardInstanceId
  );
  const [card] = player.hand.splice(handIndex, 1);

  player.mana -= card.definition.cost;
  player.board.push(createUnitInstance(card));
  next.consecutivePasses = 0;
  passPriority(next, playerId);

  return next;
}

function playSpell(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  target: SpellTarget
): GameState {
  const next = cloneState(state);
  const player = next.players[playerId];
  const handIndex = player.hand.findIndex(
    (card) => card.instanceId === cardInstanceId
  );
  const [card] = player.hand.splice(handIndex, 1);

  spendSpellMana(player, card.definition.cost);
  for (const effect of card.definition.effects ?? []) {
    applySpellEffect(next, playerId, card, effect, target);
  }
  player.graveyard.push(card);
  runCleanupPipeline(next);
  next.consecutivePasses = 0;
  passPriority(next, playerId);
  return checkWinConditions(next);
}

function declareAttacker(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): GameState {
  const next = cloneState(state);
  const unit = findUnit(next, playerId, unitInstanceId);
  unit.exhausted = true;
  next.combat.attackers.push({ attackerId: unit.instanceId });
  next.consecutivePasses = 0;

  return next;
}

function removeAttacker(
  state: GameState,
  playerId: PlayerId,
  unitInstanceId: string
): GameState {
  const next = cloneState(state);
  const unit = findUnit(next, playerId, unitInstanceId);
  unit.exhausted = false;
  next.combat.attackers = next.combat.attackers.filter(
    (lane) => lane.attackerId !== unitInstanceId
  );
  next.consecutivePasses = 0;
  return next;
}

function commitAttack(state: GameState, playerId: PlayerId): GameState {
  const next = cloneState(state);
  const defenderId = opponentOf(playerId);
  next.phase = "BLOCK";
  next.consecutivePasses = 0;
  next.priorityPlayerId = defenderId;
  next.activePlayerId = defenderId;
  next.turn += 1;
  return next;
}

function declareBlocker(
  state: GameState,
  playerId: PlayerId,
  attackerId: string,
  blockerId: string
): GameState {
  const next = cloneState(state);
  findUnit(next, playerId, blockerId);
  const lane = next.combat.attackers.find(
    (candidate) => candidate.attackerId === attackerId
  );
  if (lane) {
    lane.blockerId = blockerId;
  }
  next.consecutivePasses = 0;

  return next;
}

function removeBlocker(
  state: GameState,
  playerId: PlayerId,
  blockerId: string
): GameState {
  const next = cloneState(state);
  findUnit(next, playerId, blockerId);
  const lane = next.combat.attackers.find(
    (candidate) => candidate.blockerId === blockerId
  );
  if (lane) {
    lane.blockerId = undefined;
  }
  next.consecutivePasses = 0;
  return next;
}

function commitBlocks(state: GameState, playerId: PlayerId): GameState {
  const next = cloneState(state);
  next.phase = "COMBAT";
  next.consecutivePasses = 0;
  next.priorityPlayerId = opponentOf(playerId);
  next.activePlayerId = opponentOf(playerId);
  next.turn += 1;
  return next;
}

function resolveCombat(state: GameState): GameState {
  const next = cloneState(state);
  const attackerPlayer = next.players[next.attackTokenPlayerId];
  const defenderId = opponentOf(next.attackTokenPlayerId);
  const defenderPlayer = next.players[defenderId];

  for (const lane of next.combat.attackers) {
    const attacker = attackerPlayer.board.find(
      (unit) => unit.instanceId === lane.attackerId
    );
    if (!attacker) {
      continue;
    }
    if (getUnitHealth(attacker) <= 0) {
      continue;
    }

    const blocker = lane.blockerId
      ? defenderPlayer.board.find(
          (unit) => unit.instanceId === lane.blockerId
        )
      : undefined;

    if (blocker && getUnitHealth(blocker) > 0) {
      if (hasKeyword(attacker, "QUICK_ATTACK")) {
        const attackerAttack = getUnitAttack(attacker);
        const result = dealDamageToUnit(blocker, attackerAttack);
        if (hasKeyword(attacker, "OVERWHELM")) {
          defenderPlayer.nexusHp -= result.excessDamage;
        }
        if (getUnitHealth(blocker) > 0) {
          dealDamageToUnit(attacker, getUnitAttack(blocker));
        }
      } else {
        const result = dealDamageToUnit(blocker, getUnitAttack(attacker));
        dealDamageToUnit(attacker, getUnitAttack(blocker));
        if (hasKeyword(attacker, "OVERWHELM")) {
          defenderPlayer.nexusHp -= result.excessDamage;
        }
      }
    } else {
      defenderPlayer.nexusHp -= getUnitAttack(attacker);
    }
  }

  runCleanupPipeline(next, "COMBAT_END");
  clearCombatAssignments(next);
  next.combat.attackers = [];
  next.phase = "ACTION";
  next.attackTokenAvailable = false;
  next.priorityPlayerId = defenderId;
  next.activePlayerId = defenderId;
  next.consecutivePasses = 0;

  return checkWinConditions(next);
}

function applySpellEffect(
  state: GameState,
  casterId: PlayerId,
  sourceCard: CardInstance,
  effect: SpellEffect,
  target: SpellTarget
): void {
  switch (effect.type) {
    case "DEAL_DAMAGE":
      if (target.type === "UNIT") {
        dealDamageToUnit(findUnit(state, target.playerId, target.unitId), effect.amount);
      } else if (target.type === "NEXUS") {
        state.players[target.playerId].nexusHp -= effect.amount;
      } else if (target.type === "SELF") {
        state.players[casterId].nexusHp -= effect.amount;
      }
      return;
    case "HEAL":
      if (target.type === "UNIT") {
        healUnit(findUnit(state, target.playerId, target.unitId), effect.amount);
      } else if (target.type === "NEXUS") {
        const player = state.players[target.playerId];
        player.nexusHp = Math.min(STARTING_NEXUS_HP, player.nexusHp + effect.amount);
      } else if (target.type === "SELF") {
        const player = state.players[casterId];
        player.nexusHp = Math.min(STARTING_NEXUS_HP, player.nexusHp + effect.amount);
      }
      return;
    case "DRAW_CARD":
      drawInto(state.players[casterId], effect.count);
      return;
    case "BUFF_UNIT": {
      if (target.type !== "UNIT") {
        return;
      }
      const unit = findUnit(state, target.playerId, target.unitId);
      const unitModifier: UnitModifier = {
        id: `${target.unitId}-${effect.type}-${state.round}-${state.turn}-${unit.modifiers.length}`,
        sourceCardId: sourceCard.definition.id,
        sourceName: sourceCard.definition.name,
        type: "BUFF",
        attackDelta: effect.attack,
        healthDelta: effect.health,
        duration: effect.duration ?? "THIS_ROUND",
        createdRound: state.round,
        createdTurn: state.turn
      };
      unit.modifiers.push(unitModifier);
      return;
    }
  }
}

function spendSpellMana(player: PlayerState, cost: number): void {
  const spellManaPaid = Math.min(player.spellMana, cost);
  player.spellMana -= spellManaPaid;
  player.mana -= cost - spellManaPaid;
}

function shuffleDeck(deck: CardInstance[], seed: number): CardInstance[] {
  const shuffled = [...deck];
  const random = createRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function createRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function dealDamageToUnit(
  unit: UnitInstance,
  amount: number
): { damageDealt: number; excessDamage: number } {
  if (amount <= 0) {
    return { damageDealt: 0, excessDamage: 0 };
  }

  if (removeKeyword(unit, "BARRIER")) {
    return { damageDealt: 0, excessDamage: 0 };
  }

  const modifiedDamage = hasKeyword(unit, "TOUGH") ? Math.max(0, amount - 1) : amount;
  const healthBefore = getUnitHealth(unit);
  const damageDealt = Math.min(healthBefore, modifiedDamage);
  unit.damage += modifiedDamage;
  return {
    damageDealt,
    excessDamage: Math.max(0, modifiedDamage - healthBefore)
  };
}

function healUnit(unit: UnitInstance, amount: number): void {
  if (amount <= 0) {
    return;
  }
  unit.damage = Math.max(0, unit.damage - amount);
}

function hasKeyword(unit: UnitInstance, keyword: Keyword): boolean {
  return unit.keywords.includes(keyword);
}

function removeKeyword(unit: UnitInstance, keyword: Keyword): boolean {
  const index = unit.keywords.indexOf(keyword);
  if (index === -1) {
    return false;
  }
  unit.keywords.splice(index, 1);
  return true;
}

function endTurn(state: GameState, playerId: PlayerId): GameState {
  const next = cloneState(state);
  next.consecutivePasses += 1;
  if (next.consecutivePasses >= 2) {
    beginNextRound(next);
    return checkWinConditions(next);
  }
  passPriority(next, playerId);
  next.turn += 1;
  runCleanupPipeline(next, "END_TURN");
  return next;
}

function passPriority(state: GameState, playerId: PlayerId): void {
  state.priorityPlayerId = opponentOf(playerId);
  state.activePlayerId = opponentOf(playerId);
}

function cleanupDeadUnits(player: PlayerState): void {
  const survivors: UnitInstance[] = [];
  for (const unit of player.board) {
    if (getUnitHealth(unit) <= 0) {
      player.graveyard.push({
        instanceId: unit.instanceId,
        definition: unit.definition,
        ownerId: unit.ownerId
      });
    } else {
      survivors.push(unit);
    }
  }
  player.board = survivors;
}

function runCleanupPipeline(
  state: GameState,
  timing?: "END_TURN" | "END_ROUND" | "COMBAT_END"
): void {
  if (timing === "END_TURN") {
    expireModifiers(state, "THIS_TURN");
  } else if (timing === "END_ROUND") {
    expireModifiers(state, "THIS_TURN");
    expireModifiers(state, "THIS_ROUND");
  } else if (timing === "COMBAT_END") {
    expireModifiers(state, "UNTIL_COMBAT_END");
  }

  cleanupDeadUnits(state.players.P1);
  cleanupDeadUnits(state.players.P2);
}

function expireModifiers(
  state: GameState,
  duration: "THIS_TURN" | "THIS_ROUND" | "UNTIL_COMBAT_END"
): void {
  for (const playerId of PLAYER_IDS) {
    for (const unit of state.players[playerId].board) {
      unit.modifiers = unit.modifiers.filter(
        (modifier) => modifier.duration !== duration
      );
    }
  }
}

function clearCombatAssignments(state: GameState): void {
  for (const playerId of PLAYER_IDS) {
    state.players[playerId].board = state.players[playerId].board.map((unit) => ({
      ...unit,
      attacking: false,
      blockingUnitId: undefined,
      blockedByUnitId: undefined
    }));
  }
}
