import { GameEvent } from "./events";
import { executeTriggeredAbilities } from "./abilities";
import { GameState } from "./types";
import { updateChampionProgress } from "./engine";

export function emitEvent(state: GameState, event: GameEvent): void {
  updateChampionProgress(state, event);
  updateAbilityProgress(state, event);
  executeTriggeredAbilities(state, event);
}

function updateAbilityProgress(state: GameState, event: GameEvent): void {
  if (event.type === "SPELL_CAST" && event.playerId) {
    const progress = state.players[event.playerId].abilityProgress;
    progress["SPELLS_CAST_THIS_ROUND"] = (progress["SPELLS_CAST_THIS_ROUND"] || 0) + 1;
  }

  if (event.type === "UNIT_DIED" && event.playerId) {
    const progress = state.players[event.playerId].abilityProgress;
    progress["UNIT_DIED_THIS_GAME"] = (progress["UNIT_DIED_THIS_GAME"] || 0) + 1;
  }
}
