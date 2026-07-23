import { describe, expect, it } from "vitest";
import { applyAction, createInitialGameState } from "../../src/game/core/engine";
import type { GameState } from "../../src/game/types";
import { timeoutMessageMatches, type MatchRecord } from "../../src/aws-lambdas/handleTimeout";
import { buildTurnTimeoutMessage } from "../../src/aws-lambdas/turnTimeoutQueue";

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

describe("delayed turn timeout messages", () => {
  it("builds a 30-second message from the authoritative engine timer", () => {
    const state = startedState();
    const timeout = buildTurnTimeoutMessage({
      matchId: "match-1",
      state,
      stateVersion: 7,
      now: 1_000
    });

    expect(timeout).toEqual({
      delaySeconds: 30,
      message: {
        matchId: "match-1",
        stateVersion: 7,
        expectedPlayerId: "P1",
        turnStartTime: 1_000,
        turnDuration: 30_000,
        deadline: 31_000
      }
    });
  });

  it("does not enqueue another timeout after the game is finished", () => {
    const state = startedState();
    state.winnerId = "P2";

    expect(buildTurnTimeoutMessage({
      matchId: "match-1",
      state,
      stateVersion: 8,
      now: 1_000
    })).toBeUndefined();
  });

  it("rejects stale messages after the state version changes", () => {
    const state = startedState();
    const match: MatchRecord = {
      match_id: "match-1",
      status: "IN_PROGRESS",
      state_version: 8,
      engine_state: state
    };
    const timeout = buildTurnTimeoutMessage({
      matchId: match.match_id,
      state,
      stateVersion: 7,
      now: 1_000
    });

    expect(timeout).toBeDefined();
    expect(timeoutMessageMatches(match, timeout!.message)).toBe(false);
  });
});
