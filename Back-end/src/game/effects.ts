import {
  CardDefinition,
  CardInstance,
  CardType,
  EffectDefinition,
  GameState,
  GameValidationError,
  PlayerId,
  QueuedEffect,
  SpellTarget,
  UnitModifier
} from "./types";
import {
  BOARD_LIMIT,
  checkWinConditions,
  findUnit,
  opponentOf
} from "./rules/gameRules";
import { runCleanupPipeline } from "./engine";
import { createCardInstance, createUnitInstance, getCardDefinitionForInstance, isUnitCard } from "./cards";
import { getCardDefinition, listCards } from "./cardRegistry";
import { emitEvent } from "./triggers";
import {
  addDebuff,
  addModifier,
  banishFromGraveyard,
  dealDamage,
  discardCards,
  drawCards,
  grantKeyword,
  healTarget,
  reviveFromGraveyardToHand,
  summonUnit
} from "./operations";

export function enqueueEffect(state: GameState, queuedEffect: QueuedEffect): void {
  state.effectQueue.push(queuedEffect);
}

export function enqueueEffects(state: GameState, queuedEffects: QueuedEffect[]): void {
  state.effectQueue.push(...queuedEffects);
}

export function resolveEffectQueue(state: GameState): void {
  let iterations = 0;
  const MAX_EFFECTS = 100;

  while (state.effectQueue.length > 0) {
    if (state.winnerId) return; // Stop resolving effects if game is over
    
    if (iterations >= MAX_EFFECTS) {
      throw new GameValidationError("Maximum effect resolution limit exceeded. Infinite loop detected.");
    }
    iterations++;

    const nextEffect = state.effectQueue.shift();
    if (!nextEffect) continue;

    applyEffect(state, nextEffect);
    
    // After each effect, run cleanup and check for win conditions.
    runCleanupPipeline(state);
    checkWinConditions(state);
  }
}

export function resolvePlayedSpellEffectTarget(
  effect: EffectDefinition,
  casterId: PlayerId,
  selectedTarget: SpellTarget
): SpellTarget | undefined {
  switch (effect.target) {
    case "SELF":
      if (
        (effect.type === "BUFF_UNIT" || effect.type === "GRANT_KEYWORD") &&
        selectedTarget.type === "UNIT"
      ) {
        return selectedTarget;
      }
      return { type: "SELF", playerId: casterId };
    case "ALLY_NEXUS":
      return { type: "NEXUS", playerId: casterId };
    case "ENEMY_NEXUS":
      return { type: "NEXUS", playerId: opponentOf(casterId) };
    case "ENEMY_UNIT":
    case "ALLY_UNIT":
    case "NEXUS":
    case "ALLY_GRAVEYARD":
    case "ENEMY_GRAVEYARD":
      return selectedTarget;
    case "RECALL_UNIT":
      return selectedTarget;
    case "RESTORE_SPELL_MANA":
    case "DRAW_CARD_BY_FILTER":
    case "CREATE_RANDOM_CARD":
    case "SUMMON_FROM_DECK":
    case "SUMMON_FROM_HAND_OR_DECK":
      return undefined;
    case "SOURCE":
    case "EVENT_UNIT":
    case "RANDOM_ENEMY_UNIT":
      return selectedTarget;
  }
}

function applyEffect(state: GameState, queuedEffect: QueuedEffect): void {
  const { sourcePlayerId, sourceId, sourceName, sourceCardId, effect, target } = queuedEffect;
  const casterId = sourcePlayerId;

  switch (effect.type) {
    case "DEAL_DAMAGE":
      if (target) {
        dealDamage(
          state,
          {
            playerId: casterId,
            sourceId,
            sourceInstanceId: sourceId,
            sourceCardId,
            damageType: "SPELL"
          },
          target,
          effect.amount
        );
      }
      return;
    case "HEAL":
      if (target) {
        healTarget(state, target, effect.amount);
      }
      return;
    case "DRAW_CARD":
      drawCards(state, casterId, effect.count);
      return;
    case "DISCARD_CARD": {
      const ids = state.players[casterId].hand
        .slice(0, effect.count ?? 1)
        .map((card) => card.instanceId);
      discardCards(state, casterId, ids);
      return;
    }
    case "BUFF_UNIT": {
      if (target?.type !== "UNIT") {
        return;
      }
      try {
        findUnit(state, target.playerId, target.unitId);
        addModifier(state, target.unitId, {
          sourceCardId: sourceId,
          sourceName: sourceName ?? sourceId,
          type: "BUFF",
          attackDelta: effect.attack,
          healthDelta: effect.health,
          duration: effect.duration ?? "THIS_ROUND"
        });
      } catch (e) {}
      return;
    }
    case "BUFF_ACTIVE_ALLIES": {
      for (const unit of state.players[casterId].board) {
        addModifier(state, unit.instanceId, {
          sourceCardId: sourceCardId ?? sourceId,
          sourceName: sourceName ?? sourceId,
          type: "BUFF",
          attackDelta: effect.attack,
          healthDelta: effect.health,
          duration: effect.duration ?? "THIS_ROUND"
        });
      }
      return;
    }
    case "DEBUFF_UNIT": {
      if (target?.type !== "UNIT") {
        return;
      }
      try {
        findUnit(state, target.playerId, target.unitId);
        addDebuff(state, target.unitId, {
          sourceCardId: sourceId,
          sourceName: sourceName ?? sourceId,
          type: "DEBUFF",
          attackDelta: effect.attackDelta,
          healthDelta: effect.healthDelta,
          duration: effect.duration ?? "THIS_ROUND"
        });
      } catch (e) {}
      return;
    }
    case "BURN_ACTIVE_ENEMIES": {
      const opponentId = opponentOf(casterId);
      for (const unit of [...state.players[opponentId].board]) {
        dealDamage(
          state,
          {
            playerId: casterId,
            sourceId,
            sourceInstanceId: sourceId,
            sourceCardId,
            damageType: "EFFECT"
          },
          { type: "UNIT", playerId: opponentId, unitId: unit.instanceId },
          effect.amount
        );
      }
      return;
    }
    case "BANISH_GRAVEYARD": {
      if (target?.type !== "GRAVEYARD" || !target.cardInstanceId) {
        return;
      }
      banishFromGraveyard(state, target.playerId, target.cardInstanceId, sourceId);
      return;
    }
    case "GRANT_KEYWORD": {
      if (target?.type !== "UNIT") {
        return;
      }
      try {
        findUnit(state, target.playerId, target.unitId);
        grantKeyword(state, target.unitId, effect.keyword);
      } catch(e) {}
      return;
    }
    case "SUMMON_UNIT": {
      if (effect.cardDefinition) {
        summonUnit(
          state,
          casterId,
          effect.cardDefinition.id,
          createGeneratedInstanceId(state, effect.cardDefinition.id)
        );
      }
      return;
    }
    case "RESTORE_SPELL_MANA": {
      const player = state.players[casterId];
      player.spellMana = Math.min(3, player.spellMana + effect.amount);
      return;
    }
    case "DRAW_CARD_BY_FILTER":
      drawCardsByFilter(state, casterId, effect);
      return;
    case "CREATE_RANDOM_CARD":
      createRandomCard(state, casterId, effect.archetype, effect.cardType);
      return;
    case "SUMMON_FROM_DECK":
      summonFromZones(state, casterId, effect, ["deck"]);
      return;
    case "SUMMON_FROM_HAND_OR_DECK":
      summonFromZones(state, casterId, effect, ["hand", "deck"]);
      return;
    case "RECALL_UNIT": {
      if (target?.type === "UNIT") {
        recallUnit(state, target.playerId, target.unitId);
      }
      return;
    }
    case "REVIVE_CARD": {
      if (target?.type !== "GRAVEYARD" || !target.cardInstanceId) {
        return;
      }

      const revivedCard = reviveFromGraveyardToHand(
        state,
        target.playerId,
        target.cardInstanceId,
        effect.allowedTypes
      );
      if (revivedCard) {
        state.visualEvents.push({ type: "DRAW", playerId: target.playerId, count: 1 });
      }
      return;
    }
  }
}

function createGeneratedInstanceId(state: GameState, cardId: string): string {
  const id = `${cardId}-generated-${state.rngSeed}`;
  state.rngSeed += 1;
  return id;
}

function drawCardsByFilter(
  state: GameState,
  playerId: PlayerId,
  filter: Extract<EffectDefinition, { type: "DRAW_CARD_BY_FILTER" }>
): void {
  const player = state.players[playerId];
  let drawn = 0;

  for (let index = 0; index < filter.count; index += 1) {
    const deckIndex = player.deck.findIndex((card) =>
      isCollectibleCardDefinition(getCardDefinitionForInstance(card)) &&
      cardDefinitionMatches(getCardDefinitionForInstance(card), filter)
    );
    if (deckIndex === -1) {
      return;
    }

    const [card] = player.deck.splice(deckIndex, 1);
    player.hand.push(card);
    drawn += 1;
    emitEvent(state, { type: "CARD_DRAWN", playerId, cardInstanceId: card.instanceId });
  }

  if (drawn > 0) {
    state.visualEvents.push({ type: "DRAW", playerId, count: drawn });
  }
}

function createRandomCard(
  state: GameState,
  playerId: PlayerId,
  archetype: string,
  cardType?: CardType
): void {
  const candidates = listCards().filter(
    (definition) =>
      definition.archetype === archetype &&
      (!cardType || definition.type === cardType) &&
      definition.level !== 2
  );
  if (candidates.length === 0) {
    return;
  }

  const definition = candidates[state.rngSeed % candidates.length];
  const card = createCardInstance(
    definition.id,
    playerId,
    `${definition.id}-created-${state.rngSeed}`
  );
  state.rngSeed += 1;
  state.players[playerId].hand.push(card);
  state.visualEvents.push({ type: "DRAW", playerId, count: 1 });
}

function summonFromZones(
  state: GameState,
  playerId: PlayerId,
  filter: Extract<
    EffectDefinition,
    { type: "SUMMON_FROM_DECK" } | { type: "SUMMON_FROM_HAND_OR_DECK" }
  >,
  zones: Array<"hand" | "deck">
): void {
  if (state.players[playerId].board.length >= BOARD_LIMIT) {
    return;
  }

  for (const zone of zones) {
    const cards = state.players[playerId][zone];
    const index = cards.findIndex((card) =>
      (zone !== "deck" || isCollectibleCardDefinition(getCardDefinitionForInstance(card))) &&
      cardDefinitionMatches(getCardDefinitionForInstance(card), filter)
    );
    if (index === -1) {
      continue;
    }

    const [card] = cards.splice(index, 1);
    summonCardInstance(state, playerId, card);
    return;
  }
}

function summonCardInstance(state: GameState, playerId: PlayerId, card: CardInstance): void {
  const definition = getCardDefinition(card.cardId);
  if (!isUnitCard(definition)) {
    return;
  }

  const unit = createUnitInstance(card);
  state.players[playerId].board.push(unit);
  emitEvent(state, {
    type: "UNIT_SUMMONED",
    playerId,
    cardInstanceId: card.instanceId,
    unitInstanceId: unit.instanceId,
    sourcePlayerId: playerId,
    sourceInstanceId: card.instanceId,
    sourceCardId: card.cardId
  });
}

function recallUnit(state: GameState, playerId: PlayerId, unitId: string): void {
  const board = state.players[playerId].board;
  const index = board.findIndex((unit) => unit.instanceId === unitId);
  if (index === -1) {
    return;
  }

  const [unit] = board.splice(index, 1);
  state.players[playerId].hand.push({
    instanceId: unit.instanceId,
    cardId: unit.cardId,
    ownerId: playerId
  });
}

function cardDefinitionMatches(
  definition: CardDefinition,
  filter: {
    cardType?: CardType;
    cardTypes?: CardType[];
    spellSpeed?: CardDefinition["spellSpeed"];
    archetype?: string;
    maxCost?: number;
  }
): boolean {
  if (filter.cardType && definition.type !== filter.cardType) {
    return false;
  }
  if (filter.cardTypes && !filter.cardTypes.includes(definition.type)) {
    return false;
  }
  if (filter.spellSpeed && definition.spellSpeed !== filter.spellSpeed) {
    return false;
  }
  if (filter.archetype && definition.archetype !== filter.archetype) {
    return false;
  }
  if (filter.maxCost !== undefined && definition.cost > filter.maxCost) {
    return false;
  }
  return true;
}

function isCollectibleCardDefinition(definition: CardDefinition): boolean {
  return definition.level !== 2;
}
