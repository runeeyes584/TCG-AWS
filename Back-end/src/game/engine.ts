import {
  createUnitInstance,
  getCardDefinitionForInstance,
  getCardDefinitionForUnit,
  getUnitAttack,
  getUnitHealth,
  isChampionCard
} from "./cards";
import { getCardDefinition, registerCardDefinition, registerCardDefinitions } from "./cardRegistry";
import {
  checkWinConditions,
  cloneState,
  findUnit,
  MAX_MANA,
  MAX_SPELL_MANA,
  HAND_LIMIT,
  opponentOf,
  PLAYER_IDS,
  STARTING_HAND_SIZE,
  STARTING_NEXUS_HP,
  validateAction
} from "./rules";
import {
  AbilityTargetMap,
  AdditionalCostDefinition,
  CardDefinition,
  CardInstance,
  GameAction,
  GameState,
  GameValidationError,
  Keyword,
  PlayerId,
  PendingChoice,
  PlayerState,
  SpellTarget,
  UnitInstance
} from "./types";
import { enqueueEffect, resolveEffectQueue, resolvePlayedSpellEffectTarget } from "./effects";
import {
  executeAbility,
  executePlayedSpellAbilities,
  getMissingRequiredTargets
} from "./abilities";
import { emitEvent } from "./triggers";
import { GameEvent } from "./events";
import {
  cleanupDeadUnits,
  moveCardToGraveyard,
  moveSpellToGraveyard
} from "./graveyard";
import {
  dealDamage,
  dealDamageToUnitState,
  discardCards as discardCardsOperation,
  drawCards as drawCardsOperation,
  healTarget,
  sacrificeUnit
} from "./operations";
export {
  getGraveyardEntries,
  findReviveTargets,
  moveUnitToGraveyard,
  moveCardToGraveyard,
  moveSpellToGraveyard,
  cleanupDeadUnits
} from "./graveyard";

export function updateChampionProgress(state: GameState, event: GameEvent): void {
  switch (event.type) {
    case "UNIT_DIED":
      if (event.playerId) {
        state.players[event.playerId].championProgress["ALLIES_DIED"] = 
          (state.players[event.playerId].championProgress["ALLIES_DIED"] || 0) + 1;
      }
      break;
    case "SPELL_CAST":
      if (event.playerId) {
        state.players[event.playerId].championProgress["SPELLS_CAST"] = 
          (state.players[event.playerId].championProgress["SPELLS_CAST"] || 0) + 1;
      }
      break;
    case "UNIT_STRUCK":
      if (event.playerId && event.unitInstanceId) {
        const key = championStrikeProgressKey(event.unitInstanceId);
        state.players[event.playerId].championProgress[key] =
          (state.players[event.playerId].championProgress[key] || 0) + 1;
      }
      break;
    case "NEXUS_DAMAGED":
      if (event.playerId && event.amount) {
        const dealerId = event.sourcePlayerId ?? opponentOf(event.playerId);
        state.players[dealerId].championProgress["NEXUS_DAMAGE_DEALT"] = 
          (state.players[dealerId].championProgress["NEXUS_DAMAGE_DEALT"] || 0) + event.amount;
      }
      break;
  }
}

export function checkChampionLevelUps(state: GameState): void {
  for (const playerId of PLAYER_IDS) {
    if (state.winnerId) {
      return;
    }

    const player = state.players[playerId];
    for (const unit of player.board) {
      if (!shouldLevelChampion(player, unit)) {
        continue;
      }

      const definition = getCardDefinitionForUnit(unit);
      const level2Code = definition.level2CardCode ?? definition.leveledUpCardId;
      const level2Def = level2Code ? getCardDefinition(level2Code) : undefined;
      if (level2Def) {
        levelChampionUnit(state, playerId, unit, level2Def);
      }
    }
  }
}

function shouldLevelChampion(player: PlayerState, unit: UnitInstance): boolean {
  const definition = getCardDefinitionForUnit(unit);
  if (
    !isChampionCard(definition) ||
    definition.level !== 1 ||
    !definition.levelUpCondition
  ) {
    return false;
  }

  const condition = definition.levelUpCondition;
  const key =
    condition.type === "THIS_CHAMPION_STRUCK"
      ? championStrikeProgressKey(unit.instanceId)
      : condition.type;

  return (player.championProgress[key] || 0) >= condition.threshold;
}

function levelChampionUnit(
  state: GameState,
  playerId: PlayerId,
  unit: UnitInstance,
  level2Def: CardDefinition
): void {
  unit.cardId = level2Def.id;
  unit.attack = level2Def.attack ?? unit.attack;
  unit.maxHealth = level2Def.health ?? unit.maxHealth;
  unit.keywords = [...(level2Def.keywords ?? [])];

  emitEvent(state, {
    type: "CHAMPION_LEVELED_UP",
    playerId,
    unitInstanceId: unit.instanceId
  });
  state.visualEvents.push({
    type: "CHAMPION_LEVELED_UP",
    playerId,
    unitId: unit.instanceId,
    newLevel: 2
  });
}

function championStrikeProgressKey(unitInstanceId: string): string {
  return `CHAMPION_STRUCK:${unitInstanceId}`;
}

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
    graveyard: [],
    championProgress: {},
    abilityProgress: {}
  };
}

export function createInitialGameState(
  p1Deck: Array<CardInstance | CardDefinition> = [],
  p2Deck: Array<CardInstance | CardDefinition> = [],
  rngSeed = 1,
  extraCardRegistry: Record<string, CardDefinition> = {}
): GameState {
  registerCardDefinitions(Object.values(extraCardRegistry));
  const normalizedP1Deck = normalizeDeck(p1Deck, "P1");
  const normalizedP2Deck = normalizeDeck(p2Deck, "P2");

  return {
    players: {
      P1: createInitialPlayerState("P1", normalizedP1Deck),
      P2: createInitialPlayerState("P2", normalizedP2Deck)
    },
    activePlayerId: "P1",
    priorityPlayerId: "P1",
    attackTokenPlayerId: "P1",
    attackTokenAvailable: true,
    phase: "ACTION",
    pendingDiscard: undefined,
    combat: {
      attackers: []
    },
    round: 0,
    turn: 0,
    consecutivePasses: 0,
    rngSeed,
    started: false,
    effectQueue: [],
    visualEvents: []
  };
}

export function applyAction(state: GameState, action: GameAction): GameState {
  validateAction(state, action);

  let cleanState = cloneState(state);
  cleanState.visualEvents = [];

  let next = cleanState;
  switch (action.type) {
    case "START_GAME":
      next = startGame(cleanState, action.firstPlayerId ?? "P1");
      break;
    case "DRAW_CARD":
      next = drawCards(cleanState, action.playerId, action.count ?? 1);
      break;
    case "DISCARD_CARD":
      next = discardCard(cleanState, action.playerId, action.cardInstanceId);
      break;
    case "START_ROUND":
      next = startRound(cleanState);
      break;
    case "PLAY_UNIT":
      next = playUnit(
        cleanState,
        action.playerId,
        action.cardInstanceId,
        action.replaceUnitId,
        action.target,
        action.costTargets
      );
      break;
    case "PLAY_SPELL":
      next = playSpell(cleanState, action.playerId, action.cardInstanceId, action.target, action.costTargets);
      break;
    case "SUBMIT_ABILITY_TARGETS":
      next = submitAbilityTargets(cleanState, action.playerId, action.targets);
      break;
    case "CANCEL_PENDING_CHOICE":
      next = cancelPendingChoice(cleanState, action.playerId);
      break;
    case "DECLARE_ATTACKER":
      next = declareAttacker(cleanState, action.playerId, action.unitInstanceId);
      break;
    case "REMOVE_ATTACKER":
      next = removeAttacker(cleanState, action.playerId, action.unitInstanceId);
      break;
    case "COMMIT_ATTACK":
      next = commitAttack(cleanState, action.playerId);
      break;
    case "DECLARE_BLOCKER":
      next = declareBlocker(
        cleanState,
        action.playerId,
        action.attackerId,
        action.blockerId
      );
      break;
    case "REMOVE_BLOCKER":
      next = removeBlocker(cleanState, action.playerId, action.blockerId);
      break;
    case "COMMIT_BLOCKS":
      next = commitBlocks(cleanState, action.playerId);
      break;
    case "RESOLVE_COMBAT":
      next = resolveCombat(cleanState);
      break;
    case "END_TURN":
      next = endTurn(cleanState, action.playerId);
      break;
  }

  runCleanupPipeline(next);
  resolveEffectQueue(next);
  return checkWinConditions(next);
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
    drawInto(next, next.players[playerId], STARTING_HAND_SIZE);
  }
  next.rngSeed += 1;

  refreshRound(next, false);
  emitEvent(next, { type: "GAME_STARTED" });
  return next;
}

function startRound(state: GameState): GameState {
  const next = cloneState(state);
  beginNextRound(next);
  return next;
}

function beginNextRound(state: GameState): void {
  const next = state;
  emitEvent(next, { type: "ROUND_ENDED" });
  runCleanupPipeline(next, "END_ROUND");
  next.round += 1;
  next.turn = 1;
  next.attackTokenPlayerId = opponentOf(next.attackTokenPlayerId);
  next.attackTokenAvailable = true;
  next.activePlayerId = next.attackTokenPlayerId;
  next.priorityPlayerId = next.attackTokenPlayerId;
  next.phase = "ACTION";
  next.pendingDiscard = undefined;
  next.combat.attackers = [];
  next.consecutivePasses = 0;
  refreshRound(next, true);
  if (next.winnerId) {
    return;
  }
  requestDiscardIfNeeded(next, next.priorityPlayerId);
  emitEvent(next, { type: "ROUND_STARTED" });
}

function refreshRound(state: GameState, draw: boolean): void {
  for (const playerId of PLAYER_IDS) {
    if (state.winnerId) {
      return;
    }

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
    } as UnitInstance));
    player.abilityProgress["SPELLS_CAST_THIS_ROUND"] = 0;
    if (draw) {
      drawInto(state, player, 1);
    }
  }
}

function drawCards(state: GameState, playerId: PlayerId, count: number): GameState {
  const next = cloneState(state);
  drawInto(next, next.players[playerId], count);
  return next;
}

function discardCard(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string
): GameState {
  const next = cloneState(state);
  const player = next.players[playerId];
  discardCardsOperation(next, playerId, [cardInstanceId]);

  if (player.hand.length <= (next.pendingDiscard?.downTo ?? HAND_LIMIT)) {
    const returnPhase = next.pendingDiscard?.returnPhase ?? "ACTION";
    next.pendingDiscard = undefined;
    next.phase = returnPhase;
  }

  return next;
}

export function drawInto(state: GameState, player: PlayerState, count: number): void {
  drawCardsOperation(state, player.id, count);
}

function playUnit(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  replaceUnitId?: string,
  target?: SpellTarget,
  costTargets?: SpellTarget[],
  abilityTargets?: AbilityTargetMap
): GameState {
  const next = cloneState(state);
  const player = next.players[playerId];
  const handIndex = player.hand.findIndex(
    (card) => card.instanceId === cardInstanceId
  );
  const [card] = player.hand.splice(handIndex, 1);
  const definition = getCardDefinitionForInstance(card);
  const onPlayAbilities = (definition.abilities ?? []).filter((ability) => ability.onPlay);

  for (const ability of onPlayAbilities) {
    const selectedTargets: AbilityTargetMap = abilityTargets ?? (target ? { target } : {});
    const missingTargets = getMissingRequiredTargets(ability, selectedTargets);
    if (missingTargets.length > 0) {
      player.hand.splice(handIndex, 0, card);
      next.pendingChoice = {
        playerId,
        sourceInstanceId: card.instanceId,
        sourceCardId: card.cardId,
        abilityId: ability.id,
        requiredTargets: missingTargets,
        chosenTargets: selectedTargets,
        returnPhase: next.phase,
        playUnit: { replaceUnitId, costTargets }
      };
      next.priorityPlayerId = playerId;
      next.activePlayerId = playerId;
      return next;
    }
  }

  payAdditionalCost(next, playerId, definition.additionalCost, costTargets);
  player.mana -= definition.cost;
  
  if (replaceUnitId) {
    sacrificeUnit(next, playerId, replaceUnitId, "EFFECT");
  }
  
  player.board.push(createUnitInstance(card));
  next.consecutivePasses = 0;
  passPriority(next, playerId);

  emitEvent(next, {
    type: "CARD_PLAYED",
    playerId,
    cardInstanceId,
    sourcePlayerId: playerId,
    sourceInstanceId: card.instanceId,
    sourceCardId: card.cardId
  });
  emitEvent(next, {
    type: "UNIT_SUMMONED",
    playerId,
    cardInstanceId,
    unitInstanceId: card.instanceId,
    sourcePlayerId: playerId,
    sourceInstanceId: card.instanceId,
    sourceCardId: card.cardId,
    targetPlayerId: playerId,
    targetInstanceId: card.instanceId,
    targetUnitId: card.instanceId,
    targetCardId: card.cardId
  });

  // Handle on-play abilities that require player targeting
  for (const ability of onPlayAbilities) {
    const selectedTargets: AbilityTargetMap = abilityTargets ?? (target ? { target } : {});
    const unit = player.board.find((candidate) => candidate.instanceId === card.instanceId);
    executeAbility(next, ability, {
      sourceId: card.instanceId,
      sourceName: definition.name,
      sourcePlayerId: playerId,
      sourceUnit: unit,
      selectedTargets
    });
    continue;
    const missingTargets = getMissingRequiredTargets(ability, selectedTargets);
    if (missingTargets.length > 0) {
      // Player must choose target → create pendingChoice
      next.pendingChoice = {
        playerId,
        sourceInstanceId: card.instanceId,
        sourceCardId: card.cardId,
        abilityId: ability.id,
        requiredTargets: missingTargets,
        chosenTargets: selectedTargets,
        returnPhase: next.phase
      };
      next.priorityPlayerId = playerId;
      next.activePlayerId = playerId;
    } else {
      // All targets resolved → execute ability immediately
      const unit = player.board.find(u => u.instanceId === card.instanceId);
      executeAbility(next, ability, {
        sourceId: card.instanceId,
        sourceName: definition.name,
        sourcePlayerId: playerId,
        sourceUnit: unit,
        selectedTargets
      });
    }
  }

  return next;
}

function playSpell(
  state: GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  target: SpellTarget,
  costTargets?: SpellTarget[]
): GameState {
  const next = cloneState(state);
  const player = next.players[playerId];
  const handIndex = player.hand.findIndex(
    (card) => card.instanceId === cardInstanceId
  );
  const [card] = player.hand.splice(handIndex, 1);
  const definition = getCardDefinitionForInstance(card);
  const spellSpeed = definition.spellSpeed ?? "slow";
  const selectedTargets = createPlayedSpellTargetMap(playerId, target);

  const pendingAbility = (definition.abilities ?? [])
    .filter((ability) => !ability.when)
    .map((ability) => ({
      ability,
      missingTargets: getMissingRequiredTargets(ability, selectedTargets)
    }))
    .find((candidate) => candidate.missingTargets.length > 0);

  if (pendingAbility) {
    player.hand.splice(handIndex, 0, card);
    next.pendingChoice = {
      playerId,
      sourceInstanceId: card.instanceId,
      sourceCardId: card.cardId,
      abilityId: pendingAbility.ability.id,
      requiredTargets: pendingAbility.missingTargets,
      chosenTargets: selectedTargets,
      costTargets,
      returnPhase: next.phase
    };
    next.priorityPlayerId = playerId;
    next.activePlayerId = playerId;
    return next;
  }

  payAdditionalCost(next, playerId, definition.additionalCost, costTargets);
  spendSpellMana(player, definition.cost);
  if (definition.abilities?.length) {
    executePlayedSpellAbilities(next, card, target);
  } else {
    for (const effect of definition.effects ?? []) {
      enqueueEffect(next, {
        sourceId: card.instanceId,
        sourceName: definition.name,
        sourceCardId: card.cardId,
        sourcePlayerId: playerId,
        effect,
        target: resolvePlayedSpellEffectTarget(effect, playerId, target)
      });
    }
  }
  // Move spell card to graveyard with full metadata
  moveSpellToGraveyard(next, card, playerId);
  next.consecutivePasses = 0;
  // TODO: Add a full stack/response window for fast and slow spells.
  if (spellSpeed !== "burst") {
    passPriority(next, playerId);
  }
  
  emitPlayedSpellEvents(next, playerId, card, target);

  return next;
}

function submitAbilityTargets(
  state: GameState,
  playerId: PlayerId,
  targets: AbilityTargetMap
): GameState {
  const next = cloneState(state);
  const pendingChoice = next.pendingChoice;
  if (!pendingChoice) {
    return next;
  }

  const player = next.players[playerId];
  if (pendingChoice.playUnit) {
    const selectedTargets = {
      ...pendingChoice.chosenTargets,
      ...targets
    };
    assertUniqueUnitTargets(selectedTargets);
    const remainingTargets = pendingChoice.requiredTargets.filter(
      (targetDefinition) => !selectedTargets[targetDefinition.id]
    );

    if (remainingTargets.length > 0) {
      next.pendingChoice = {
        ...pendingChoice,
        chosenTargets: selectedTargets,
        requiredTargets: remainingTargets
      };
      return next;
    }

    next.pendingChoice = undefined;
    return playUnit(
      next,
      playerId,
      pendingChoice.sourceInstanceId,
      pendingChoice.playUnit.replaceUnitId,
      undefined,
      pendingChoice.playUnit.costTargets,
      selectedTargets
    );
  }

  // Check if the source is a unit on the board (on-play ability)
  const boardUnit = player.board.find(
    (u) => u.instanceId === pendingChoice.sourceInstanceId
  );
  if (boardUnit) {
    // On-play ability: source is a unit already on the board
    return submitOnPlayAbilityTargets(next, playerId, pendingChoice, boardUnit, targets);
  }
  // Otherwise, source is a spell card in hand (existing flow)
  const cardIndex = player.hand.findIndex(
    (card) => card.instanceId === pendingChoice.sourceInstanceId
  );
  const card = player.hand[cardIndex];
  if (!card) {
    throw new GameValidationError("Pending choice source card is not in hand.");
  }
  const definition = getCardDefinitionForInstance(card);
  const ability = (definition.abilities ?? []).find(
    (candidate) => candidate.id === pendingChoice.abilityId
  );
  if (!ability) {
    throw new GameValidationError("Pending choice ability not found.");
  }

  const selectedTargets = {
    ...pendingChoice.chosenTargets,
    ...targets
  };
  rejectSourceCardAsHandTarget(selectedTargets, pendingChoice.sourceInstanceId);

  if (player.mana + player.spellMana < definition.cost) {
    throw new GameValidationError("Not enough mana.");
  }

  payAdditionalCost(next, playerId, definition.additionalCost, pendingChoice.costTargets);
  executeAbility(next, ability, {
    sourceId: card.instanceId,
    sourceName: definition.name,
    sourcePlayerId: playerId,
    sourceCard: card,
    selectedTargets
  });

  const playedCardIndex = player.hand.findIndex(
    (candidate) => candidate.instanceId === pendingChoice.sourceInstanceId
  );
  if (playedCardIndex === -1) {
    throw new GameValidationError("Pending choice source card is not in hand.");
  }
  const [playedCard] = player.hand.splice(playedCardIndex, 1);
  spendSpellMana(player, definition.cost);
  moveSpellToGraveyard(next, playedCard, playerId);
  next.pendingChoice = undefined;
  next.phase = pendingChoice.returnPhase;
  next.consecutivePasses = 0;
  if ((definition.spellSpeed ?? "slow") !== "burst") {
    passPriority(next, playerId);
  }

  emitPlayedSpellEvents(next, playerId, playedCard, selectedTargets.target);
  return next;
}

function submitOnPlayAbilityTargets(
  state: GameState,
  playerId: PlayerId,
  pendingChoice: PendingChoice,
  unit: UnitInstance,
  targets: AbilityTargetMap
): GameState {
  const definition = getCardDefinitionForUnit(unit);
  const ability = (definition.abilities ?? []).find(
    (candidate) => candidate.id === pendingChoice.abilityId
  );
  if (!ability) {
    throw new GameValidationError("Pending choice ability not found.");
  }
  const selectedTargets = {
    ...pendingChoice.chosenTargets,
    ...targets
  };
  executeAbility(state, ability, {
    sourceId: unit.instanceId,
    sourceName: definition.name,
    sourcePlayerId: playerId,
    sourceUnit: unit,
    selectedTargets
  });
  state.pendingChoice = undefined;
  state.phase = pendingChoice.returnPhase;
  // Restore priority to opponent — playUnit already called passPriority
  // before the pendingChoice temporarily overrode it to the caster.
  state.priorityPlayerId = opponentOf(playerId);
  state.activePlayerId = opponentOf(playerId);
  return state;
}

function cancelPendingChoice(state: GameState, _playerId: PlayerId): GameState {
  const next = cloneState(state);
  if (next.pendingChoice) {
    next.phase = next.pendingChoice.returnPhase;
    next.pendingChoice = undefined;
  }
  return next;
}

function createPlayedSpellTargetMap(
  playerId: PlayerId,
  target: SpellTarget
): AbilityTargetMap {
  return {
    target,
    self: { type: "SELF", playerId }
  };
}

function rejectSourceCardAsHandTarget(
  targets: AbilityTargetMap,
  sourceInstanceId: string
): void {
  for (const target of Object.values(targets)) {
    if (target.type === "HAND_CARD" && target.cardInstanceId === sourceInstanceId) {
      throw new GameValidationError("Ability cannot choose its source card as a hand-card target.");
    }
  }
}

function emitPlayedSpellEvents(
  state: GameState,
  playerId: PlayerId,
  card: CardInstance,
  target?: SpellTarget
): void {
  emitEvent(state, {
    type: "CARD_PLAYED",
    playerId,
    cardInstanceId: card.instanceId,
    sourcePlayerId: playerId,
    sourceInstanceId: card.instanceId,
    sourceCardId: card.cardId
  });
  emitEvent(state, {
    type: "SPELL_CAST",
    playerId,
    cardInstanceId: card.instanceId,
    target,
    sourcePlayerId: playerId,
    sourceInstanceId: card.instanceId,
    sourceCardId: card.cardId
  });
}

function payAdditionalCost(
  state: GameState,
  playerId: PlayerId,
  cost?: AdditionalCostDefinition,
  costTargets: SpellTarget[] = []
): void {
  if (!cost) {
    return;
  }

  switch (cost.type) {
    case "SACRIFICE_UNITS":
      for (const target of costTargets) {
        if (target.type !== "UNIT") {
          continue;
        }
        sacrificeUnit(state, playerId, target.unitId, "EFFECT");
      }
      return;
  }
}

function assertUniqueUnitTargets(targets: AbilityTargetMap): void {
  const seen = new Set<string>();
  for (const target of Object.values(targets)) {
    if (target.type !== "UNIT") {
      continue;
    }
    const key = `${target.playerId}:${target.unitId}`;
    if (seen.has(key)) {
      throw new GameValidationError("Ability targets must be unique.");
    }
    seen.add(key);
  }
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

  emitEvent(next, { type: "ATTACK_DECLARED", playerId, unitInstanceId });
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

  emitEvent(next, { type: "BLOCK_DECLARED", playerId, attackerId, blockerId });

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
        const result = dealDamageToUnit(next, blocker, attackerAttack, attacker);
        emitUnitStruck(next, attacker, result.damageDealt, blocker);
        if (hasKeyword(attacker, "OVERWHELM")) {
          dealCombatNexusDamage(next, attacker, defenderId, result.excessDamage);
        }
        if (getUnitHealth(blocker) > 0) {
          const blockerResult = dealDamageToUnit(next, attacker, getUnitAttack(blocker), blocker);
          emitUnitStruck(next, blocker, blockerResult.damageDealt, attacker);
        }
      } else {
        const result = dealDamageToUnit(next, blocker, getUnitAttack(attacker), attacker);
        emitUnitStruck(next, attacker, result.damageDealt, blocker);
        const blockerResult = dealDamageToUnit(next, attacker, getUnitAttack(blocker), blocker);
        emitUnitStruck(next, blocker, blockerResult.damageDealt, attacker);
        if (hasKeyword(attacker, "OVERWHELM")) {
          dealCombatNexusDamage(next, attacker, defenderId, result.excessDamage);
        }
      }
    } else {
      emitUnitStruck(next, attacker, getUnitAttack(attacker));
      dealCombatNexusDamage(next, attacker, defenderId, getUnitAttack(attacker));
    }
  }

  runCleanupPipeline(next, "COMBAT_END", "COMBAT");
  clearCombatAssignments(next);
  next.combat.attackers = [];
  next.phase = "ACTION";
  next.attackTokenAvailable = false;
  next.priorityPlayerId = defenderId;
  next.activePlayerId = defenderId;
  next.consecutivePasses = 0;

  return next;
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

export function dealDamageToUnit(
  state: GameState,
  unit: UnitInstance,
  amount: number,
  sourceUnit?: UnitInstance
): { damageDealt: number; excessDamage: number } {
  return dealDamageToUnitState(
    state,
    unit,
    amount,
    sourceUnit
      ? {
          playerId: sourceUnit.ownerId,
          sourceId: sourceUnit.instanceId,
          sourceInstanceId: sourceUnit.instanceId,
          sourceCardId: sourceUnit.cardId,
          damageType: "COMBAT"
        }
      : undefined
  );
}

function dealCombatNexusDamage(
  state: GameState,
  attacker: UnitInstance,
  defenderId: PlayerId,
  amount: number
): void {
  dealDamage(
    state,
    {
      playerId: attacker.ownerId,
      sourceId: attacker.instanceId,
      sourceInstanceId: attacker.instanceId,
      sourceCardId: attacker.cardId,
      damageType: "COMBAT"
    },
    { type: "NEXUS", playerId: defenderId },
    amount
  );
}

function emitUnitStruck(
  state: GameState,
  unit: UnitInstance,
  amount: number,
  targetUnit?: UnitInstance
): void {
  emitEvent(state, {
    type: "UNIT_STRUCK",
    playerId: unit.ownerId,
    unitInstanceId: unit.instanceId,
    sourcePlayerId: unit.ownerId,
    sourceInstanceId: unit.instanceId,
    sourceCardId: unit.cardId,
    targetPlayerId: targetUnit?.ownerId,
    targetInstanceId: targetUnit?.instanceId,
    targetUnitId: targetUnit?.instanceId,
    targetCardId: targetUnit?.cardId,
    amount
  });
}

export function healUnit(state: GameState, unit: UnitInstance, amount: number): void {
  healTarget(state, { type: "UNIT", playerId: unit.ownerId, unitId: unit.instanceId }, amount);
}

export function hasKeyword(unit: UnitInstance, keyword: Keyword): boolean {
  return unit.keywords.includes(keyword);
}

function endTurn(state: GameState, playerId: PlayerId): GameState {
  const next = cloneState(state);
  next.consecutivePasses += 1;
  if (next.consecutivePasses >= 2) {
    beginNextRound(next);
    return next;
  }
  passPriority(next, playerId);
  next.turn += 1;
  emitEvent(next, { type: "TURN_ENDED" });
  runCleanupPipeline(next, "END_TURN");
  emitEvent(next, { type: "TURN_STARTED" });
  return next;
}

function passPriority(state: GameState, playerId: PlayerId): void {
  state.priorityPlayerId = opponentOf(playerId);
  state.activePlayerId = opponentOf(playerId);
  if (state.phase === "ACTION") {
    requestDiscardIfNeeded(state, state.priorityPlayerId);
  }
}

function requestDiscardIfNeeded(state: GameState, playerId: PlayerId): void {
  if (state.players[playerId].hand.length <= HAND_LIMIT) {
    return;
  }

  state.pendingDiscard = {
    playerId,
    downTo: HAND_LIMIT,
    returnPhase: "ACTION"
  };
  state.phase = "DISCARD";
  state.priorityPlayerId = playerId;
  state.activePlayerId = playerId;
}


export function runCleanupPipeline(
  state: GameState,
  timing?: "END_TURN" | "END_ROUND" | "COMBAT_END",
  cause: import("./types").GraveyardCause = "EFFECT"
): void {
  if (timing === "END_TURN") {
    expireModifiers(state, "THIS_TURN");
  } else if (timing === "END_ROUND") {
    expireModifiers(state, "THIS_TURN");
    expireModifiers(state, "THIS_ROUND");
  } else if (timing === "COMBAT_END") {
    expireModifiers(state, "UNTIL_COMBAT_END");
  }

  for (const playerId of PLAYER_IDS) {
    cleanupDeadUnits(state, state.players[playerId], cause);
  }
  
  checkChampionLevelUps(state);
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
  // After expiry, dead units (health dropped below 0 due to lost health buffs) are caught
  // by cleanupDeadUnits called immediately after in runCleanupPipeline.
}

function clearCombatAssignments(state: GameState): void {
  for (const playerId of PLAYER_IDS) {
    state.players[playerId].board = state.players[playerId].board.map((unit) => ({
      ...unit,
      attacking: false,
      blockingUnitId: undefined,
      blockedByUnitId: undefined
    } as UnitInstance));
  }
}

function normalizeDeck(
  deck: Array<CardInstance | CardDefinition>,
  ownerId: PlayerId
): CardInstance[] {
  return deck.map((entry, index) => {
    if ("instanceId" in entry) {
      if (!entry.cardId) {
        throw new Error("Card instance requires cardId.");
      }
      getCardDefinition(entry.cardId);
      return { instanceId: entry.instanceId, cardId: entry.cardId, ownerId: entry.ownerId };
    }

    registerCardDefinition(entry);
    return {
      instanceId: `${ownerId}-${entry.id}-${index}`,
      cardId: entry.id,
      ownerId
    };
  });
}
