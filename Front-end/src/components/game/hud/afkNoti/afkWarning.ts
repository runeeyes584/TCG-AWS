import type { GameState } from "@backend/game/types";

/**
 * Identifies one AFK warning. The engine restarts the turn clock on each timeout, so two warnings never share a
 * `turnStartTime`; the AFK count alone does not tell them apart, as it returns to 1 once the player acts again.
 */
export function afkWarningKey(state: Pick<GameState, "turnStartTime">, afkCount: number): string {
  return `${state.turnStartTime}:${afkCount}`;
}
