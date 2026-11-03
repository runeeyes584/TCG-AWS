import type { GameState } from "@backend/game/types";
import type { ToastInput } from "../../../ui/feedback";

/**
 * Identifies one AFK warning. The engine restarts the turn clock on each timeout, so two warnings never share a
 * `turnStartTime`; the AFK count alone does not tell them apart, as it returns to 1 once the player acts again.
 */
export function afkWarningKey(state: Pick<GameState, "turnStartTime">, afkCount: number): string {
  return `${state.turnStartTime}:${afkCount}`;
}

/**
 * The toast of an AFK warning. The first one is a yellow warning; after that it is red, as the next missed turn
 * costs the match.
 */
export function afkToastInput(afkCount: number): ToastInput {
  const base = { key: "afk", duration: 8000, placement: "game" } as const;
  return afkCount === 1
    ? {
        ...base,
        tone: "warning",
        badge: "SYSTEM WARNING · TIMEOUT ALERT",
        title: "TURN MISSED",
        message: "You missed your turn. Your next turn will be limited to 15 seconds.",
      }
    : {
        ...base,
        tone: "danger",
        badge: "SECURITY PROTOCOL · AFK VIOLATION",
        title: "SURRENDER IMMINENT",
        message: "AFK warning! You will lose the match if you stay inactive next turn.",
      };
}
