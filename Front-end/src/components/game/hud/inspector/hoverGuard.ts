import type { GameState, UnitInstance } from "@backend/game/types";

/**
 * Whether a unit is still on the table, on either side. The label of a card under the pointer is only ever for a card
 * that is there: if the unit is gone (killed, recalled, the match reset) while the label is still up, the label is a
 * leftover and goes, whatever kept it.
 */
export function isUnitOnTable(state: Pick<GameState, "players">, unit: Pick<UnitInstance, "instanceId">): boolean {
  return (["P1", "P2"] as const).some((playerId) =>
    state.players[playerId].board.some((candidate) => candidate.instanceId === unit.instanceId)
  );
}
