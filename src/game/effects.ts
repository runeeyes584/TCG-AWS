import {
  EffectDefinition,
  GameState,
  GameValidationError,
  PlayerId,
  SpellTarget,
  UnitModifier
} from "./types";
import { checkWinConditions, findUnit, STARTING_NEXUS_HP, opponentOf } from "./rules";
import { dealDamageToUnit, healUnit, drawInto, runCleanupPipeline } from "./engine";
import { createUnitInstance } from "./cards";
import { emitEvent } from "./triggers";

export interface QueuedEffect {
  sourceId: string;       // ID of the card/unit that created this effect
  sourcePlayerId: PlayerId; // Player who controls the source
  effect: EffectDefinition;
  target?: SpellTarget;   // Target for the effect, if applicable
}

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

function applyEffect(state: GameState, queuedEffect: QueuedEffect): void {
  const { sourcePlayerId, sourceId, effect, target } = queuedEffect;
  const casterId = sourcePlayerId;

  switch (effect.type) {
    case "DEAL_DAMAGE":
      if (target?.type === "UNIT") {
        try {
          const unit = findUnit(state, target.playerId, target.unitId);
          dealDamageToUnit(state, unit, effect.amount);
        } catch (e) {
          // Unit might be dead or gone
        }
      } else if (target?.type === "NEXUS") {
        state.players[target.playerId].nexusHp -= effect.amount;
        state.visualEvents.push({ type: "DAMAGE", targetId: `nexus-${target.playerId}`, amount: effect.amount, isNexus: true });
        emitEvent(state, { type: "NEXUS_DAMAGED", playerId: target.playerId, amount: effect.amount });
      } else if (target?.type === "SELF") {
        state.players[casterId].nexusHp -= effect.amount;
        state.visualEvents.push({ type: "DAMAGE", targetId: `nexus-${casterId}`, amount: effect.amount, isNexus: true });
        emitEvent(state, { type: "NEXUS_DAMAGED", playerId: casterId, amount: effect.amount });
      }
      return;
    case "HEAL":
      if (target?.type === "UNIT") {
        try {
          const unit = findUnit(state, target.playerId, target.unitId);
          healUnit(state, unit, effect.amount);
        } catch (e) {}
      } else if (target?.type === "NEXUS") {
        const player = state.players[target.playerId];
        const amount = Math.min(STARTING_NEXUS_HP - player.nexusHp, effect.amount);
        if (amount > 0) {
          player.nexusHp += amount;
          state.visualEvents.push({ type: "HEAL", targetId: `nexus-${target.playerId}`, amount, isNexus: true });
        }
      } else if (target?.type === "SELF") {
        const player = state.players[casterId];
        const amount = Math.min(STARTING_NEXUS_HP - player.nexusHp, effect.amount);
        if (amount > 0) {
          player.nexusHp += amount;
          state.visualEvents.push({ type: "HEAL", targetId: `nexus-${casterId}`, amount, isNexus: true });
        }
      }
      return;
    case "DRAW_CARD":
      drawInto(state, state.players[casterId], effect.count);
      return;
    case "BUFF_UNIT": {
      if (target?.type !== "UNIT") {
        return;
      }
      try {
        const unit = findUnit(state, target.playerId, target.unitId);
        const unitModifier: UnitModifier = {
          id: `${target.unitId}-${effect.type}-${state.round}-${state.turn}-${unit.modifiers.length}`,
          sourceCardId: sourceId,
          sourceName: sourceId,
          type: "BUFF",
          attackDelta: effect.attack,
          healthDelta: effect.health,
          duration: effect.duration ?? "THIS_ROUND",
          createdRound: state.round,
          createdTurn: state.turn
        };
        unit.modifiers.push(unitModifier);
        state.visualEvents.push({ type: "BUFF", targetId: unit.instanceId, attackDelta: effect.attack ?? 0, healthDelta: effect.health ?? 0 });
      } catch (e) {}
      return;
    }
    case "GRANT_KEYWORD": {
      if (target?.type !== "UNIT") {
        return;
      }
      try {
        const unit = findUnit(state, target.playerId, target.unitId);
        if (!unit.keywords.includes(effect.keyword)) {
          unit.keywords.push(effect.keyword);
        }
      } catch(e) {}
      return;
    }
    case "SUMMON_UNIT": {
      const player = state.players[casterId];
      if (player.board.length < 6) { // 6 is BOARD_LIMIT
         // Need a way to create a unit from an ID. 
         // Assuming effect.cardDefinition is available or we pass the definition?
         // We can put it inside the effect payload.
         if (effect.cardDefinition) {
            const instance = createUnitInstance({
              instanceId: `${effect.cardDefinition.id}-${Date.now()}-${Math.random()}`,
              definition: effect.cardDefinition,
              ownerId: casterId
            });
            player.board.push(instance);
         }
      }
      return;
    }
    case "REVIVE_UNIT": {
      const targetPlayerId = effect.target === "ALLY_GRAVEYARD" ? casterId : opponentOf(casterId);
      const player = state.players[targetPlayerId];
      if (player.graveyard.length === 0 || player.board.length >= 6) return;
      
      let entryIndex = player.graveyard.length - 1; // Default to most recently dead
      if (target?.type === "GRAVEYARD" && target.cardInstanceId) {
        const found = player.graveyard.findIndex(c => c.instanceId === target.cardInstanceId);
        if (found !== -1) entryIndex = found;
      }
      
      const [entry] = player.graveyard.splice(entryIndex, 1);
      
      const instance = createUnitInstance({
        instanceId: `${entry.definition.id}-${Date.now()}-${Math.random()}`,
        definition: entry.definition,
        ownerId: targetPlayerId
      });
      player.board.push(instance);
      state.visualEvents.push({ type: "DRAW", playerId: targetPlayerId, count: 0 }); // Placeholder for summon animation? We don't have SUMMON_UNIT visual event.
      // Wait, let's emit UNIT_SUMMONED event.
      emitEvent(state, { type: "UNIT_SUMMONED", playerId: targetPlayerId, cardInstanceId: entry.instanceId, unitInstanceId: instance.instanceId });
      return;
    }
  }
}
