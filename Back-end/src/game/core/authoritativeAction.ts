import { applyAction } from "./engine";
import type { GameAction, GameState } from "../types";

/**
 * Applies one client command as one authoritative state transition.
 *
 * Combat resolution is deliberately coupled to COMMIT_BLOCKS here. Sending
 * COMMIT_BLOCKS and RESOLVE_COMBAT as separate API Gateway messages creates a
 * race between two Lambda invocations reading the same DynamoDB state.
 */
export function applyAuthoritativeAction(
  state: GameState,
  action: GameAction
): GameState {
  const nextState = applyAction(state, action);
  return action.type === "COMMIT_BLOCKS"
    ? applyAction(nextState, { type: "RESOLVE_COMBAT" })
    : nextState;
}
