import type { CombatAttacker, PlayerId, UnitInstance } from "@backend/game/types";

export interface BoardRows {
  /** The six lanes of the active row; a lane without a unit is `undefined`. */
  active: Array<UnitInstance | undefined>;
  /** Every other unit of the player: the waiting row. */
  waiting: UnitInstance[];
}

/**
 * Splits a player's board into the active row and the waiting row, as the table draws them. While
 * a combat is being set up the active row is its lanes (the attacker of each lane for the player
 * who holds the attack token, the blocker for the other); otherwise it is the units whose
 * `boardRow` is `ACTIVE`.
 */
export function splitBoardRows(
  board: UnitInstance[],
  attackers: CombatAttacker[],
  playerId: PlayerId,
  attackTokenPlayerId: PlayerId
): BoardRows {
  const active: Array<UnitInstance | undefined> =
    attackers.length > 0
      ? attackers.map((lane) => {
          const unitId = playerId === attackTokenPlayerId ? lane.attackerId : lane.blockerId;
          return unitId ? board.find((unit) => unit.instanceId === unitId) : undefined;
        })
      : board.filter((unit) => unit.boardRow === "ACTIVE");
  const activeIds = new Set(active.filter((unit): unit is UnitInstance => Boolean(unit)).map((unit) => unit.instanceId));
  return { active, waiting: board.filter((unit) => !activeIds.has(unit.instanceId)) };
}
