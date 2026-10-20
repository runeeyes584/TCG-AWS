import { describe, expect, it } from "vitest";
import { createCardInstance, createUnitInstance } from "../entities/cards";
import { reviveFromGraveyardToBoard } from "../operations/revive";
import { applyAction, createInitialGameState } from "./engine";
import { applyAuthoritativeAction } from "./authoritativeAction";
import type { CardDefinition, GameState, PlayerId, UnitInstance } from "../types";

const filler: CardDefinition = { id: "return-test-unit", name: "Filler", type: "unit", cost: 1, attack: 2, health: 5 };

const deck = (ownerId: PlayerId) =>
  Array.from({ length: 10 }, (_, index) => createCardInstance(filler, ownerId, `${ownerId}-deck-${index}`));

function unit(ownerId: PlayerId, id: string, patch: Partial<UnitInstance> = {}): UnitInstance {
  return { ...createUnitInstance(createCardInstance(filler, ownerId, id)), ...patch };
}

function started(): GameState {
  const state = applyAction(createInitialGameState(deck("P1"), deck("P2")), { type: "START_GAME", firstPlayerId: "P1" });
  // `rebirthed` and `rebirthed2` came back from the graveyard: they stand in the active row.
  state.players.P1.board = [unit("P1", "a1"), unit("P1", "a2"), unit("P1", "rebirthed", { boardRow: "ACTIVE" })];
  state.players.P2.board = [unit("P2", "b1"), unit("P2", "rebirthed2", { boardRow: "ACTIVE" })];
  return state;
}

const rows = (state: GameState) =>
  [...state.players.P1.board, ...state.players.P2.board].map((candidate) => candidate.boardRow);

describe("the active row after a combat", () => {
  it("sends every surviving unit back to the waiting row, including those that came back from the graveyard", () => {
    let state = started();
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "a1" });
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "a2" });
    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
    state = applyAction(state, { type: "DECLARE_BLOCKER", playerId: "P2", attackerId: "a1", blockerId: "b1" });
    state = applyAuthoritativeAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });

    expect(state.combat.attackers).toEqual([]);
    expect(rows(state).every((row) => row === "WAITING")).toBe(true);
  });

  it("does the same when the defender is timed out instead of committing", () => {
    let state = started();
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "a1" });
    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
    state = applyAction(state, { type: "TIME_OUT", playerId: "P2" });

    expect(state.combat.attackers).toEqual([]);
    expect(rows(state).every((row) => row === "WAITING")).toBe(true);
  });

  it("lets a unit that came back from the graveyard declare as an attacker straight from the active row", () => {
    let state = started();
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "rebirthed" });
    expect(state.combat.attackers.map((lane) => lane.attackerId)).toEqual(["rebirthed"]);
  });
});

describe("a round that ends without a combat", () => {
  it("sends the units back to the waiting row as well", () => {
    let state = started();
    state = applyAction(state, { type: "END_TURN", playerId: "P1" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });

    expect(state.round).toBe(2);
    expect(rows(state).every((row) => row === "WAITING")).toBe(true);
  });
});

describe("attackers that were declared but never committed", () => {
  it("are withdrawn, and ready again, when the attacker is timed out", () => {
    let state = started();
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "a1" });
    expect(state.combat.attackers).toHaveLength(1);
    state = applyAction(state, { type: "TIME_OUT", playerId: "P1" });

    expect(state.combat.attackers).toEqual([]);
    expect(state.players.P1.board.find((candidate) => candidate.instanceId === "a1")?.exhausted).toBe(false);
    expect(state.priorityPlayerId).toBe("P2");
  });

  it("are withdrawn when the attacker passes the turn", () => {
    let state = started();
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "a1" });
    state = applyAction(state, { type: "END_TURN", playerId: "P1" });

    expect(state.combat.attackers).toEqual([]);
  });
});

describe("a unit that comes back from the graveyard", () => {
  it("joins the active row", () => {
    const state = started();
    state.players.P1.board = [];
    state.players.P1.graveyard = [
      { id: "fallen-gy", instanceId: "fallen", cardId: filler.id, ownerId: "P1", type: "UNIT", round: 1, cause: "COMBAT" }
    ];
    createCardInstance(filler, "P1", "fallen");
    const revived = reviveFromGraveyardToBoard(state, "P1", "fallen");

    expect(revived?.boardRow).toBe("ACTIVE");
  });
});
