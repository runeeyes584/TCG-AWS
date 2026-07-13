import { moveUnitToGraveyard } from "../mechanics/graveyard";
import {
  GameState,
  GameValidationError,
  GraveyardCause,
  PlayerId,
  UnitInstance
} from "../types";

export function sacrificeUnit(
  state: GameState,
  playerId: PlayerId,
  unitId: string,
  cause: GraveyardCause = "EFFECT"
): UnitInstance {
  const player = state.players[playerId];
  const unitIndex = player.board.findIndex((unit) => unit.instanceId === unitId);
  if (unitIndex === -1) {
    throw new GameValidationError("Sacrifice unit is not on board.");
  }

  const [unit] = player.board.splice(unitIndex, 1);
  moveUnitToGraveyard(state, unit, cause);
  return unit;
}

export function sacrificeUnits(
  state: GameState,
  playerId: PlayerId,
  unitIds: string[],
  cause: GraveyardCause = "EFFECT"
): UnitInstance[] {
  return unitIds.map((unitId) => sacrificeUnit(state, playerId, unitId, cause));
}
