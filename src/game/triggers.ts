import { GameEvent } from "./events";
import { enqueueEffects } from "./effects";
import { GameState, PlayerId, QueuedEffect, SpellTarget, Trigger } from "./types";
import { opponentOf, PLAYER_IDS } from "./rules";
import { updateChampionProgress } from "./engine";

export function emitEvent(state: GameState, event: GameEvent): void {
  updateChampionProgress(state, event);
  
  const activeTriggers = getActiveTriggers(state);
  
  for (const { trigger, sourcePlayerId } of activeTriggers) {
    if (trigger.event === event.type) {
      if (!trigger.condition || trigger.condition(state, event)) {
        
        // Enqueue the trigger's effects
        const queuedEffects: QueuedEffect[] = trigger.effects.map(effect => ({
          sourceId: trigger.sourceId,
          sourceName: trigger.id,
          sourcePlayerId,
          effect,
          target: resolveTarget(state, trigger, effect, sourcePlayerId, event)
        }));
        
        state.visualEvents.push({ type: "TRIGGER_ACTIVATED", sourceId: trigger.sourceId, effectName: trigger.id });
        enqueueEffects(state, queuedEffects);
      }
    }
  }
}

function getActiveTriggers(state: GameState): Array<{ trigger: Trigger, sourcePlayerId: PlayerId }> {
  const activeTriggers: Array<{ trigger: Trigger, sourcePlayerId: PlayerId }> = [];
  
  // Triggers typically originate from units currently on the board
  for (const playerId of PLAYER_IDS) {
    const player = state.players[playerId];
    for (const unit of player.board) {
      if (unit.definition.triggers) {
        for (const trigger of unit.definition.triggers) {
           activeTriggers.push({ trigger: { ...trigger, sourceId: unit.instanceId }, sourcePlayerId: playerId });
        }
      }
    }
  }
  
  return activeTriggers;
}

function resolveTarget(
  state: GameState,
  trigger: Trigger,
  effect: QueuedEffect["effect"],
  sourcePlayerId: PlayerId,
  event: GameEvent
): SpellTarget | undefined {
  if (effect.target === "SOURCE") {
    return { type: "UNIT", playerId: sourcePlayerId, unitId: trigger.sourceId };
  }

  if (effect.target === "EVENT_UNIT") {
    return resolveEventUnitTarget(event);
  }

  if (effect.target === "ALLY_NEXUS") {
    return { type: "NEXUS", playerId: sourcePlayerId };
  }

  if (effect.target === "ENEMY_NEXUS") {
    return { type: "NEXUS", playerId: opponentOf(sourcePlayerId) };
  }

  if (effect.target === "RANDOM_ENEMY_UNIT") {
    return resolveRandomEnemyUnitTarget(state, sourcePlayerId);
  }

  if (effect.target === "SELF") {
    if (effect.type === "DRAW_CARD") {
      return { type: "SELF", playerId: sourcePlayerId };
    }
    return { type: "UNIT", playerId: sourcePlayerId, unitId: trigger.sourceId };
  }
  if (effect.target === "ALLY_UNIT" || effect.target === "ENEMY_UNIT") {
    return { type: "UNIT", playerId: sourcePlayerId, unitId: trigger.sourceId };
  }
  if (effect.target === "NEXUS") {
    if (effect.type === "HEAL") {
      return { type: "NEXUS", playerId: sourcePlayerId };
    }
    return { type: "NEXUS", playerId: opponentOf(sourcePlayerId) };
  }
  return undefined;
}

function resolveEventUnitTarget(event: GameEvent): SpellTarget | undefined {
  const unitId = event.unitInstanceId ?? event.attackerId ?? event.blockerId;
  if (!event.playerId || !unitId) {
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
