import { describe, expect, it } from "vitest";
import { applyAction, createInitialGameState } from "../core/engine";
import type { GameState } from "../types";
import {
  ACTION_LATE_TOLERANCE_MS,
  OPPONENT_CLAIM_DELAY_MS,
  TIMEOUT_EARLY_TOLERANCE_MS,
  actionIsTooLate,
  holderMayReportTimeout,
  opponentMayClaimTimeout,
  turnDeadline,
  turnHasExpired
} from "./turnClock";

function turn(start: number, duration = 30_000): GameState {
  const state = applyAction(createInitialGameState([], [], 1), { type: "START_GAME", firstPlayerId: "P1" });
  state.winnerId = undefined;
  state.turnStartTime = start;
  state.turnDuration = duration;
  return state;
}

describe("turnClock", () => {
  const state = turn(1_000);
  const deadline = 31_000;

  it("adds the duration to the start of the turn", () => {
    expect(turnDeadline(state)).toBe(deadline);
  });

  it("has expired exactly when the deadline is reached", () => {
    expect(turnHasExpired(state, deadline - 1)).toBe(false);
    expect(turnHasExpired(state, deadline)).toBe(true);
  });

  it("lets the player in turn report their timeout only a little before the deadline", () => {
    expect(holderMayReportTimeout(state, deadline - TIMEOUT_EARLY_TOLERANCE_MS - 1)).toBe(false);
    expect(holderMayReportTimeout(state, deadline - TIMEOUT_EARLY_TOLERANCE_MS)).toBe(true);
  });

  it("never refuses an action before the deadline, nor within the late allowance after it", () => {
    expect(actionIsTooLate(state, deadline - 3_000)).toBe(false);
    expect(actionIsTooLate(state, deadline - 1)).toBe(false);
    expect(actionIsTooLate(state, deadline + ACTION_LATE_TOLERANCE_MS - 1)).toBe(false);
    expect(actionIsTooLate(state, deadline + ACTION_LATE_TOLERANCE_MS)).toBe(true);
  });

  it("lets the opponent report only after the deadline and the claim delay", () => {
    expect(opponentMayClaimTimeout(state, deadline)).toBe(false);
    expect(opponentMayClaimTimeout(state, deadline + OPPONENT_CLAIM_DELAY_MS - 1)).toBe(false);
    expect(opponentMayClaimTimeout(state, deadline + OPPONENT_CLAIM_DELAY_MS)).toBe(true);
  });

  it("leaves no gap: the opponent may report just as actions stop being accepted", () => {
    expect(OPPONENT_CLAIM_DELAY_MS).toBe(ACTION_LATE_TOLERANCE_MS);
  });

  it("gives the player in turn the first move: their report opens before the opponent's", () => {
    expect(deadline - TIMEOUT_EARLY_TOLERANCE_MS).toBeLessThan(deadline + OPPONENT_CLAIM_DELAY_MS);
  });

  it("never expires a match that has not started, is over, or has no clock", () => {
    const notStarted = { ...state, started: false };
    const over = { ...state, winnerId: "P1" as const };
    const noClock = turn(1_000, 0);
    [notStarted, over, noClock].forEach((candidate) => {
      const late = deadline + 60_000;
      expect(turnHasExpired(candidate, late)).toBe(false);
      expect(holderMayReportTimeout(candidate, late)).toBe(false);
      expect(opponentMayClaimTimeout(candidate, late)).toBe(false);
      expect(actionIsTooLate(candidate, late)).toBe(false);
    });
  });
});
