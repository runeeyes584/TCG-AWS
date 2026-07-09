import { GameEvent } from "./events";
import { enqueueEffect } from "./effects";
import {
  Ability,
  AbilityTargetMap,
  CardInstance,
  ConditionDefinition,
  CostDefinition,
  EffectDefinition,
  GameState,
  GameValidationError,
  PlayerId,
  SpellTarget,
  TargetDefinition,
  UnitInstance
} from "./types";
import { findCardInHand, findUnit, opponentOf } from "./rules";
import { getCardDefinitionForInstance, getCardDefinitionForUnit, getUnitHealth } from "./cards";
import { discardCards, sacrificeUnit } from "./operations";

export interface AbilityContext {
  sourceId: string;
  sourceName?: string;
  sourcePlayerId: PlayerId;
  sourceCard?: CardInstance;
  sourceUnit?: UnitInstance;
  selectedTargets?: AbilityTargetMap;
  event?: GameEvent;
}

export function getMissingRequiredTargets(
  ability: Ability,
  selectedTargets: AbilityTargetMap = {}
): TargetDefinition[] {
  return (ability.targets ?? []).filter(
    (targetDefinition) =>
      targetDefinition.required !== false && !selectedTargets[targetDefinition.id]
  );
}

export function executeAbility(
  state: GameState,
  ability: Ability,
  context: AbilityContext
): boolean {
  if (!doesTriggerMatch(ability, context.event)) {
    return false;
  }
  if (ability.runtimeCondition && context.event && !ability.runtimeCondition(state, context.event)) {
    return false;
  }

  assertConditions(state, ability.conditions ?? [], context);
  const targets = resolveAbilityTargets(state, ability.targets ?? [], context);
  assertCosts(state, ability.costs ?? [], context, targets);
  payCosts(state, ability.costs ?? [], context, targets);

  for (const effect of ability.effects) {
    enqueueEffect(state, {
      sourceId: context.sourceId,
      sourceName: context.sourceName ?? ability.id,
      sourceCardId: context.sourceCard?.cardId ?? context.sourceUnit?.cardId,
      sourcePlayerId: context.sourcePlayerId,
      effect,
      target: resolveEffectTarget(state, effect, context, targets)
    });
  }
  return true;
}

export function executePlayedSpellAbilities(
  state: GameState,
  card: CardInstance,
  selectedTarget: SpellTarget
): void {
  const definition = getCardDefinitionForInstance(card);
  const abilities = definition.abilities ?? [];
  const selectedTargets: AbilityTargetMap = {
    target: selectedTarget,
    self: { type: "SELF", playerId: card.ownerId }
  };

  for (const ability of abilities.filter((candidate) => !candidate.when)) {
    executeAbility(state, ability, {
      sourceId: card.instanceId,
      sourceName: definition.name,
      sourcePlayerId: card.ownerId,
      sourceCard: card,
      selectedTargets
    });
  }
}

export function executeTriggeredAbilities(state: GameState, event: GameEvent): void {
  for (const playerId of ["P1", "P2"] as PlayerId[]) {
    for (const unit of state.players[playerId].board) {
      const definition = getCardDefinitionForUnit(unit);
      for (const ability of definition.abilities ?? []) {
        if (!ability.when || ability.when.event !== event.type) {
          continue;
        }
        try {
          const didFire = executeAbility(state, ability, {
            sourceId: unit.instanceId,
            sourceName: getTriggeredAbilitySourceName(ability.id),
            sourcePlayerId: playerId,
            sourceUnit: unit,
            event
          });
          if (didFire) {
            state.visualEvents.push({
              type: "TRIGGER_ACTIVATED",
              sourceId: unit.instanceId,
              effectName: ability.id
            });
          }
        } catch {
          // Triggered abilities with unmet conditions/costs simply do not fire.
        }
      }
    }
  }
}

function getTriggeredAbilitySourceName(abilityId: string): string {
  return abilityId.startsWith("legacy-trigger:")
    ? abilityId.slice("legacy-trigger:".length)
    : abilityId;
}

function doesTriggerMatch(ability: Ability, event?: GameEvent): boolean {
  if (!ability.when) {
    return true;
  }
  return ability.when.event === event?.type;
}

function assertConditions(
  state: GameState,
  conditions: ConditionDefinition[],
  context: AbilityContext
): void {
  for (const condition of conditions) {
    switch (condition.type) {
      case "HAS_MANA":
        if (state.players[context.sourcePlayerId].mana < condition.amount) {
          throw new GameValidationError("Ability condition failed: not enough mana.");
        }
        break;
      case "HAS_CARD_IN_HAND":
        if (state.players[context.sourcePlayerId].hand.length < (condition.count ?? 1)) {
          throw new GameValidationError("Ability condition failed: not enough cards in hand.");
        }
        break;
      case "ALLY_UNIT_EXISTS":
        if (state.players[context.sourcePlayerId].board.length === 0) {
          throw new GameValidationError("Ability condition failed: no allied unit exists.");
        }
        break;
      case "SPELLS_CAST_THIS_ROUND_AT_LEAST":
        if (
          (state.players[context.sourcePlayerId].abilityProgress["SPELLS_CAST_THIS_ROUND"] || 0) <
          condition.count
        ) {
          throw new GameValidationError("Ability condition failed: not enough spells this round.");
        }
        break;
      case "UNIT_DIED_THIS_GAME_AT_LEAST":
        if (
          (state.players[context.sourcePlayerId].abilityProgress["UNIT_DIED_THIS_GAME"] || 0) <
          condition.count
        ) {
          throw new GameValidationError("Ability condition failed: not enough units died.");
        }
        break;
      case "NEXUS_HEALTH_BELOW": {
        const playerId =
          condition.player === "SELF"
            ? context.sourcePlayerId
            : opponentOf(context.sourcePlayerId);
        if (state.players[playerId].nexusHp >= condition.amount) {
          throw new GameValidationError("Ability condition failed: nexus health is too high.");
        }
        break;
      }
      case "UNIT_HAS_KEYWORD": {
        const target = context.selectedTargets?.[condition.target];
        if (target?.type !== "UNIT") {
          throw new GameValidationError("Ability condition failed: missing unit target.");
        }
        const unit = findUnit(state, target.playerId, target.unitId);
        if (!unit.keywords.includes(condition.keyword)) {
          throw new GameValidationError("Ability condition failed: unit lacks keyword.");
        }
        break;
      }
    }
  }
}

function resolveAbilityTargets(
  state: GameState,
  definitions: TargetDefinition[],
  context: AbilityContext
): AbilityTargetMap {
  const targets: AbilityTargetMap = { ...(context.selectedTargets ?? {}) };

  for (const definition of definitions) {
    const selected = targets[definition.id];
    if (!selected) {
      if (definition.kind === "SELF") {
        targets[definition.id] = context.sourceUnit
          ? {
              type: "UNIT",
              playerId: context.sourcePlayerId,
              unitId: context.sourceUnit.instanceId
            }
          : { type: "SELF", playerId: context.sourcePlayerId };
        continue;
      }
      if (definition.kind === "ALLY_NEXUS") {
        targets[definition.id] = { type: "NEXUS", playerId: context.sourcePlayerId };
        continue;
      }
      if (definition.kind === "ENEMY_NEXUS") {
        targets[definition.id] = {
          type: "NEXUS",
          playerId: opponentOf(context.sourcePlayerId)
        };
        continue;
      }
      if (definition.required !== false) {
        throw new GameValidationError("Ability requires a target.");
      }
      continue;
    }

    assertTargetDefinition(state, context.sourcePlayerId, definition, selected);
  }

  return targets;
}

function assertTargetDefinition(
  state: GameState,
  sourcePlayerId: PlayerId,
  definition: TargetDefinition,
  target: SpellTarget
): void {
  switch (definition.kind) {
    case "SELF":
      if (
        target.type !== "SELF" &&
        !(target.type === "UNIT" && target.playerId === sourcePlayerId)
      ) {
        throw new GameValidationError("Ability target must be self.");
      }
      break;
    case "ALLY_UNIT":
      if (target.type !== "UNIT" || target.playerId !== sourcePlayerId) {
        throw new GameValidationError("Ability target must be an allied unit.");
      }
      findUnit(state, target.playerId, target.unitId);
      break;
    case "ENEMY_UNIT":
      if (target.type !== "UNIT" || target.playerId !== opponentOf(sourcePlayerId)) {
        throw new GameValidationError("Ability target must be an enemy unit.");
      }
      findUnit(state, target.playerId, target.unitId);
      break;
    case "ANY_UNIT":
      if (target.type !== "UNIT") {
        throw new GameValidationError("Ability target must be a unit.");
      }
      findUnit(state, target.playerId, target.unitId);
      break;
    case "ALLY_NEXUS":
      if (target.type !== "NEXUS" || target.playerId !== sourcePlayerId) {
        throw new GameValidationError("Ability target must be allied nexus.");
      }
      break;
    case "ENEMY_NEXUS":
      if (target.type !== "NEXUS" || target.playerId !== opponentOf(sourcePlayerId)) {
        throw new GameValidationError("Ability target must be enemy nexus.");
      }
      break;
    case "ANY_TARGET":
      if (target.type === "UNIT") {
        findUnit(state, target.playerId, target.unitId);
      } else if (target.type === "HAND_CARD") {
        findCardInHand(state, target.playerId, target.cardInstanceId);
      }
      break;
    case "ALLY_HAND_CARD":
      if (target.type !== "HAND_CARD" || target.playerId !== sourcePlayerId) {
        throw new GameValidationError("Ability target must be an allied hand card.");
      }
      findCardInHand(state, target.playerId, target.cardInstanceId);
      break;
    case "ENEMY_HAND_CARD":
      if (target.type !== "HAND_CARD" || target.playerId !== opponentOf(sourcePlayerId)) {
        throw new GameValidationError("Ability target must be an enemy hand card.");
      }
      findCardInHand(state, target.playerId, target.cardInstanceId);
      break;
    case "ANY_HAND_CARD":
      if (target.type !== "HAND_CARD") {
        throw new GameValidationError("Ability target must be a hand card.");
      }
      findCardInHand(state, target.playerId, target.cardInstanceId);
      break;
  }
}

function assertCosts(
  state: GameState,
  costs: CostDefinition[],
  context: AbilityContext,
  targets: AbilityTargetMap
): void {
  for (const cost of costs) {
    switch (cost.type) {
      case "PAY_MANA":
        if (state.players[context.sourcePlayerId].mana < cost.amount) {
          throw new GameValidationError("Cannot pay ability mana cost.");
        }
        break;
      case "PAY_HEALTH":
        if (state.players[context.sourcePlayerId].nexusHp <= cost.amount) {
          throw new GameValidationError("Cannot pay ability health cost.");
        }
        break;
      case "DISCARD":
        requireDiscardHandCardTarget(state, context.sourcePlayerId, targets[cost.target]);
        break;
      case "SACRIFICE_UNIT":
      case "DESTROY_ALLY":
        requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
        break;
      case "EXHAUST_UNIT": {
        const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
        if (unit.exhausted || getUnitHealth(unit) <= 0) {
          throw new GameValidationError("Cannot exhaust unit for ability cost.");
        }
        break;
      }
    }
  }
}

function payCosts(
  state: GameState,
  costs: CostDefinition[],
  context: AbilityContext,
  targets: AbilityTargetMap
): void {
  for (const cost of costs) {
    switch (cost.type) {
      case "PAY_MANA":
        state.players[context.sourcePlayerId].mana -= cost.amount;
        break;
      case "PAY_HEALTH":
        state.players[context.sourcePlayerId].nexusHp -= cost.amount;
        break;
      case "DISCARD": {
        const target = targets[cost.target];
        requireDiscardHandCardTarget(state, context.sourcePlayerId, target);
        discardCards(state, context.sourcePlayerId, [target.cardInstanceId]);
        break;
      }
      case "SACRIFICE_UNIT":
      case "DESTROY_ALLY": {
        const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
        sacrificeUnit(state, context.sourcePlayerId, unit.instanceId, "EFFECT");
        break;
      }
      case "EXHAUST_UNIT": {
        const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
        unit.exhausted = true;
        break;
      }
    }
  }
}

function resolveEffectTarget(
  state: GameState,
  effect: EffectDefinition,
  context: AbilityContext,
  targets: AbilityTargetMap
): SpellTarget | undefined {
  const effectTarget = effect.target;
  if (!effectTarget) {
    return undefined;
  }
  if (targets[effectTarget]) {
    return targets[effectTarget];
  }

  switch (effectTarget) {
    case "SELF":
      if (effect.type === "DRAW_CARD") {
        return { type: "SELF", playerId: context.sourcePlayerId };
      }
      return resolveSourceUnitOrSelf(context);
    case "SOURCE":
      return resolveSourceUnitOrSelf(context);
    case "ALLY_NEXUS":
      return { type: "NEXUS", playerId: context.sourcePlayerId };
    case "ENEMY_NEXUS":
      return { type: "NEXUS", playerId: opponentOf(context.sourcePlayerId) };
    case "NEXUS":
      return {
        type: "NEXUS",
        playerId: effect.type === "HEAL" ? context.sourcePlayerId : opponentOf(context.sourcePlayerId)
      };
    case "EVENT_UNIT":
      return resolveEventUnitTarget(context.event);
    case "RANDOM_ENEMY_UNIT":
      return resolveRandomEnemyUnitTarget(state, context.sourcePlayerId);
    case "ALLY_UNIT":
    case "ENEMY_UNIT":
      return context.sourceUnit
        ? { type: "UNIT", playerId: context.sourcePlayerId, unitId: context.sourceUnit.instanceId }
        : targets.target;
    default:
      return targets.target;
  }
}

function resolveSourceUnitOrSelf(context: AbilityContext): SpellTarget {
  return context.sourceUnit
    ? { type: "UNIT", playerId: context.sourcePlayerId, unitId: context.sourceUnit.instanceId }
    : { type: "SELF", playerId: context.sourcePlayerId };
}

function resolveEventUnitTarget(event?: GameEvent): SpellTarget | undefined {
  const unitId = event?.unitInstanceId ?? event?.attackerId ?? event?.blockerId;
  if (!event?.playerId || !unitId) {
    return undefined;
  }
  return { type: "UNIT", playerId: event.playerId, unitId };
}

function resolveRandomEnemyUnitTarget(
  state: GameState,
  sourcePlayerId: PlayerId
): SpellTarget | undefined {
  const enemyId = opponentOf(sourcePlayerId);
  const enemyBoard = state.players[enemyId].board;
  if (enemyBoard.length === 0) {
    return undefined;
  }

  const index = state.rngSeed % enemyBoard.length;
  state.rngSeed += 1;
  return { type: "UNIT", playerId: enemyId, unitId: enemyBoard[index].instanceId };
}

function requireDiscardHandCardTarget(
  state: GameState,
  playerId: PlayerId,
  target: SpellTarget | undefined
): asserts target is { type: "HAND_CARD"; playerId: PlayerId; cardInstanceId: string } {
  if (!target || target.type !== "HAND_CARD" || target.playerId !== playerId) {
    throw new GameValidationError("Discard cost requires an allied hand card target.");
  }
  findCardInHand(state, playerId, target.cardInstanceId);
}

function requireAlliedUnitTarget(
  state: GameState,
  playerId: PlayerId,
  target: SpellTarget | undefined
): UnitInstance {
  if (!target || target.type !== "UNIT" || target.playerId !== playerId) {
    throw new GameValidationError("Cost requires an allied unit target.");
  }
  return findUnit(state, playerId, target.unitId);
}
