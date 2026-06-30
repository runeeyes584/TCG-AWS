import { GameEvent } from "./events";
import { enqueueEffect } from "./effects";
import {
  Ability,
  AbilityTargetMap,
  CardInstance,
  ConditionDefinition,
  CostDefinition,
  GameState,
  GameValidationError,
  PlayerId,
  SpellTarget,
  TargetDefinition,
  UnitInstance
} from "./types";
import { findUnit, opponentOf } from "./rules";
import { getUnitHealth } from "./cards";
import { moveCardToGraveyard, moveUnitToGraveyard } from "./graveyard";

export interface AbilityContext {
  sourceId: string;
  sourceName?: string;
  sourcePlayerId: PlayerId;
  sourceCard?: CardInstance;
  sourceUnit?: UnitInstance;
  selectedTargets?: AbilityTargetMap;
  event?: GameEvent;
}

export function executeAbility(
  state: GameState,
  ability: Ability,
  context: AbilityContext
): void {
  if (!doesTriggerMatch(ability, context.event)) {
    return;
  }

  assertConditions(state, ability.conditions ?? [], context);
  const targets = resolveAbilityTargets(state, ability.targets ?? [], context);
  assertCosts(state, ability.costs ?? [], context, targets);
  payCosts(state, ability.costs ?? [], context, targets);

  for (const effect of ability.effects) {
    enqueueEffect(state, {
      sourceId: context.sourceId,
      sourceName: context.sourceName ?? ability.id,
      sourcePlayerId: context.sourcePlayerId,
      effect,
      target: resolveEffectTarget(effect.target, context, targets)
    });
  }
}

export function executePlayedSpellAbilities(
  state: GameState,
  card: CardInstance,
  selectedTarget: SpellTarget
): void {
  const abilities = card.definition.abilities ?? [];
  const selectedTargets: AbilityTargetMap = {
    target: selectedTarget,
    self: { type: "SELF", playerId: card.ownerId }
  };

  for (const ability of abilities.filter((candidate) => !candidate.when)) {
    executeAbility(state, ability, {
      sourceId: card.instanceId,
      sourceName: card.definition.name,
      sourcePlayerId: card.ownerId,
      sourceCard: card,
      selectedTargets
    });
  }
}

export function executeTriggeredAbilities(state: GameState, event: GameEvent): void {
  for (const playerId of ["P1", "P2"] as PlayerId[]) {
    for (const unit of state.players[playerId].board) {
      for (const ability of unit.definition.abilities ?? []) {
        if (!ability.when) {
          continue;
        }
        try {
          executeAbility(state, ability, {
            sourceId: unit.instanceId,
            sourceName: unit.definition.name,
            sourcePlayerId: playerId,
            sourceUnit: unit,
            event
          });
          state.visualEvents.push({
            type: "TRIGGER_ACTIVATED",
            sourceId: unit.instanceId,
            effectName: ability.id
          });
        } catch {
          // Triggered abilities with unmet conditions/costs simply do not fire.
        }
      }
    }
  }
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
      }
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
        requireTargetCardInHand(state, context.sourcePlayerId, targets[cost.target]);
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
        const hand = state.players[context.sourcePlayerId].hand;
        if (target?.type !== "UNIT") {
          throw new GameValidationError("Discard cost requires a card target.");
        }
        const index = hand.findIndex((card) => card.instanceId === target?.unitId);
        const [card] = hand.splice(index, 1);
        moveCardToGraveyard(state, card, context.sourcePlayerId, "DISCARD");
        break;
      }
      case "SACRIFICE_UNIT":
      case "DESTROY_ALLY": {
        const unit = requireAlliedUnitTarget(state, context.sourcePlayerId, targets[cost.target]);
        state.players[context.sourcePlayerId].board = state.players[
          context.sourcePlayerId
        ].board.filter((candidate) => candidate.instanceId !== unit.instanceId);
        moveUnitToGraveyard(state, unit, "EFFECT");
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
  effectTarget: string,
  context: AbilityContext,
  targets: AbilityTargetMap
): SpellTarget | undefined {
  if (targets[effectTarget]) {
    return targets[effectTarget];
  }

  switch (effectTarget) {
    case "SELF":
    case "SOURCE":
      return context.sourceUnit
        ? { type: "UNIT", playerId: context.sourcePlayerId, unitId: context.sourceUnit.instanceId }
        : { type: "SELF", playerId: context.sourcePlayerId };
    case "ALLY_NEXUS":
      return { type: "NEXUS", playerId: context.sourcePlayerId };
    case "ENEMY_NEXUS":
    case "NEXUS":
      return { type: "NEXUS", playerId: opponentOf(context.sourcePlayerId) };
    case "EVENT_UNIT":
      return resolveEventUnitTarget(context.event);
    default:
      return targets.target;
  }
}

function resolveEventUnitTarget(event?: GameEvent): SpellTarget | undefined {
  const unitId = event?.unitInstanceId ?? event?.attackerId ?? event?.blockerId;
  if (!event?.playerId || !unitId) {
    return undefined;
  }
  return { type: "UNIT", playerId: event.playerId, unitId };
}

function requireTargetCardInHand(
  state: GameState,
  playerId: PlayerId,
  target: SpellTarget | undefined
): void {
  if (!target || target.type !== "UNIT") {
    throw new GameValidationError("Discard cost requires a card target.");
  }
  if (!state.players[playerId].hand.some((card) => card.instanceId === target.unitId)) {
    throw new GameValidationError("Discard cost card is not in hand.");
  }
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
