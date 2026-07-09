import {
  EffectDefinition,
  GameState,
  GameValidationError,
  PlayerId,
  QueuedEffect,
  SpellTarget,
  UnitModifier
} from "./types";
import {
  checkWinConditions,
  findUnit,
  opponentOf
} from "./rules";
import { runCleanupPipeline } from "./engine";
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
    case "REVIVE_CARD": {
      if (target?.type !== "GRAVEYARD" || !target.cardInstanceId) {
        return;
      }

      const revivedCard = reviveFromGraveyardToHand(
        state,
        target.playerId,
        target.cardInstanceId
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
