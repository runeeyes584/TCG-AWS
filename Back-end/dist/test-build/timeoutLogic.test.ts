import { describe, expect, it } from "vitest";
import { applyAction, createInitialGameState } from "../../src/game/core/engine";
import type { GameState } from "../../src/game/types";
import { duePlayer } from "../../src/aws-lambdas/handleTimeout";
import { turnHasExpired } from "../../src/aws-lambdas/processGameEngine";

function startedState(turnStartTime = 1_000): GameState {
  const state = applyAction(createInitialGameState([], [], 1), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.players.P1.nexusHp = 20;
  state.players.P2.nexusHp = 20;
  state.winnerId = undefined;
  state.turnStartTime = turnStartTime;
  state.turnDuration = 30_000;
  return state;
}

describe("Lambda timeout ownership", () => {
  it("uses priorityPlayerId, matching gameRules, when a deadline is due", () => {
    const state = startedState();
    state.priorityPlayerId = "P2";
    state.activePlayerId = "P1";

    expect(duePlayer({
      match_id: "match-1",
      status: "IN_PROGRESS",
      engine_state: state
    }, 31_000)).toBe("P2");
  });

  it("does not report a timeout before the deadline", () => {
    const state = startedState();

    expect(duePlayer({
      match_id: "match-1",
      status: "IN_PROGRESS",
      engine_state: state
    }, 30_999)).toBeUndefined();
    expect(turnHasExpired(state, 30_999)).toBe(false);
  });

  it("marks the deadline expired at the exact boundary", () => {
    const state = startedState();

    expect(duePlayer({
      match_id: "match-1",
      status: "IN_PROGRESS",
      engine_state: state
    }, 31_000)).toBe("P1");
    expect(turnHasExpired(state, 31_000)).toBe(true);
  });
});
