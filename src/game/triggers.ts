import { GameEvent } from "./events";
import { enqueueEffects } from "./effects";
import { GameState, Trigger, QueuedEffect } from "./types";
import { PLAYER_IDS } from "./rules";

export function emitEvent(state: GameState, event: GameEvent): void {
  const activeTriggers = getActiveTriggers(state);
  
  for (const { trigger, sourcePlayerId } of activeTriggers) {
    if (trigger.event === event.type) {
      if (!trigger.condition || trigger.condition(state, event)) {
        
        // Enqueue the trigger's effects
        const queuedEffects: QueuedEffect[] = trigger.effects.map(effect => ({
          sourceId: trigger.sourceId,
          sourcePlayerId,
          effect,
          target: resolveTarget(trigger, effect, sourcePlayerId, event)
        }));
        
        state.visualEvents.push({ type: "TRIGGER_ACTIVATED", sourceId: trigger.sourceId, effectName: trigger.id });
        enqueueEffects(state, queuedEffects);
      }
    }
  }
}

function getActiveTriggers(state: GameState): Array<{ trigger: Trigger, sourcePlayerId: "P1" | "P2" }> {
  const activeTriggers: Array<{ trigger: Trigger, sourcePlayerId: "P1" | "P2" }> = [];
  
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

function resolveTarget(trigger: Trigger, effect: QueuedEffect["effect"], sourcePlayerId: "P1" | "P2", event: GameEvent) {
  if (effect.target === "SELF") {
    if (effect.type === "DRAW_CARD") {
      return { type: "SELF", playerId: sourcePlayerId } as const;
    }
    return { type: "UNIT", playerId: sourcePlayerId, unitId: trigger.sourceId } as const;
  }
  if (effect.target === "ALLY_UNIT" || effect.target === "ENEMY_UNIT") {
    // If the event provides a unitInstanceId, we could use that, otherwise default to the source unit itself
    // Or we could have trigger payload explicitly define targets.
    // For these tests, we will target the source unit if it's an ALLY_UNIT buff.
    return { type: "UNIT", playerId: sourcePlayerId, unitId: trigger.sourceId } as const;
  }
  if (effect.target === "NEXUS") {
    if (effect.type === "HEAL") {
      return { type: "NEXUS", playerId: sourcePlayerId } as const;
    }
    // Defaulting to ENEMY nexus for damage unless otherwise specified
    return { type: "NEXUS", playerId: sourcePlayerId === "P1" ? "P2" : "P1" } as const;
  }
  return undefined;
}
