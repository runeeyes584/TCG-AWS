import type { GameState } from "../types";

/**
 * The player in turn may report their own timeout this much before the deadline: the clock of their browser is
 * synchronised with the server's, so only the delay of the request itself is left to make up for.
 */
export const TIMEOUT_EARLY_TOLERANCE_MS = 500;

/**
 * An action is accepted up to this long after the deadline, so that a click made as the clock ran out, and held up
 * by the network, still counts. An action is never refused before the deadline.
 */
export const ACTION_LATE_TOLERANCE_MS = 1_500;

/**
 * The opponent of the player in turn may report that turn's timeout, but only this long after the deadline: the
 * player in turn reports it first, and only when they are gone does the opponent's report count. It is also where
 * actions stop being accepted, so there is no gap between the two.
 */
export const OPPONENT_CLAIM_DELAY_MS = 1_500;

function hasClock(state: GameState): boolean {
  return state.started &&
    !state.winnerId &&
    Number.isFinite(state.turnStartTime) &&
    Number.isFinite(state.turnDuration) &&
    state.turnDuration > 0;
}

export function turnDeadline(state: GameState): number {
  return state.turnStartTime + state.turnDuration;
}

/** Whether the deadline of the turn has been reached. */
export function turnHasExpired(state: GameState, now = Date.now()): boolean {
  return hasClock(state) && now >= turnDeadline(state);
}

/** Whether the player in turn may report their timeout now: the deadline, less a small allowance for the request. */
export function holderMayReportTimeout(state: GameState, now = Date.now()): boolean {
  return hasClock(state) && now + TIMEOUT_EARLY_TOLERANCE_MS >= turnDeadline(state);
}

/** Whether the opponent of the player in turn may report the timeout now: the deadline and the claim delay have both passed. */
export function opponentMayClaimTimeout(state: GameState, now = Date.now()): boolean {
  return hasClock(state) && now >= turnDeadline(state) + OPPONENT_CLAIM_DELAY_MS;
}

/** Whether an action arrives too late to count: only once the deadline and the late allowance have both passed. */
export function actionIsTooLate(state: GameState, now = Date.now()): boolean {
  return hasClock(state) && now >= turnDeadline(state) + ACTION_LATE_TOLERANCE_MS;
}
