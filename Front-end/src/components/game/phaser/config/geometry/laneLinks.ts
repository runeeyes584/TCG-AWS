import type { GameState, PlayerId } from "@backend/game/types";

/** One lane of a combat: the attacker, and the blocker once there is one, on the same column of both active rows. */
export interface LaneLink {
  column: number;
  attackerId: string;
  blockerId?: string;
  /** Whose side the attacker is on: the blade runs from there to the other side's active row. */
  attackerSide: "viewer" | "opponent";
  blocked: boolean;
  /** Either unit in the lane is a champion. */
  champion: boolean;
}

/** The lanes of the combat as the table draws them: lane `i` is column `i` of both active rows. */
export function laneLinks(
  state: Pick<GameState, "combat" | "attackTokenPlayerId">,
  viewerId: PlayerId,
  isChampion: (unitId: string) => boolean
): LaneLink[] {
  return state.combat.attackers.map((lane, column) => ({
    column,
    attackerId: lane.attackerId,
    blockerId: lane.blockerId,
    attackerSide: state.attackTokenPlayerId === viewerId ? "viewer" : "opponent",
    blocked: Boolean(lane.blockerId),
    champion: isChampion(lane.attackerId) || Boolean(lane.blockerId && isChampion(lane.blockerId))
  }));
}
