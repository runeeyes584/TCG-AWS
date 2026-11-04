import { describe, expect, it } from "vitest";
import { createCardInstance, createUnitInstance } from "../entities/cards";
import { getCardDefinition } from "../entities/cardRegistry";
import { applyAction, createInitialGameState } from "./engine";
import type { CardDefinition, GameState, PlayerId } from "../types";

const filler: CardDefinition = { id: "cancel-test-filler", name: "Filler", type: "unit", cost: 1, attack: 2, health: 2 };

const deck = (ownerId: PlayerId) =>
  Array.from({ length: 10 }, (_, index) => createCardInstance(filler, ownerId, `${ownerId}-deck-${index}`));

function started(): GameState {
  return applyAction(createInitialGameState(deck("P1"), deck("P2")), { type: "START_GAME", firstPlayerId: "P1" });
}

/** P1 plays a unit whose ability needs an enemy target, so the game waits for P1 to choose. */
function pendingOnPlay(): GameState {
  const sophia = getCardDefinition("silverkeep-unit-04");
  let state = started();
  state.players.P1.hand = [createCardInstance(sophia, "P1", "sophia")];
  state.players.P1.mana = 10;
  state.players.P2.board = [createUnitInstance(createCardInstance(filler, "P2", "enemy"))];
  state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "sophia" });
  return state;
}

describe("CANCEL_PENDING_CHOICE", () => {
  it("waits for the caster while the target is being chosen", () => {
    const state = pendingOnPlay();
    expect(state.pendingChoice).toBeDefined();
    expect(state.priorityPlayerId).toBe("P1");
    expect(state.players.P1.board.map((unit) => unit.instanceId)).toEqual(["sophia"]);
    expect(state.players.P1.board[0].boardRow).toBe("WAITING");
    expect(state.players.P1.mana).toBe(10 - getCardDefinition("silverkeep-unit-04").cost);
  });

  it("keeps the unit and passes the turn on when the ability is skipped", () => {
    const pending = pendingOnPlay();
    const state = applyAction(pending, { type: "CANCEL_PENDING_CHOICE", playerId: "P1" });
    expect(state.pendingChoice).toBeUndefined();
    expect(state.players.P1.board.map((unit) => unit.instanceId)).toEqual(["sophia"]);
    expect(state.players.P1.board[0].boardRow).toBe("WAITING");
    expect(state.players.P1.hand).toHaveLength(0);
    expect(state.players.P1.mana).toBe(pending.players.P1.mana);
    expect(state.players.P2.board[0].modifiers).toHaveLength(0);
    expect(state.priorityPlayerId).toBe("P2");
    expect(state.activePlayerId).toBe("P2");
    state.players.P1.hand.push(createCardInstance(filler, "P1", "other"));
    expect(() => applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "other" }))
      .toThrow("Player does not have priority.");
  });

  it("leaves the priority exactly where choosing a target would leave it", () => {
    const skipped = applyAction(pendingOnPlay(), { type: "CANCEL_PENDING_CHOICE", playerId: "P1" });
    const chosen = applyAction(pendingOnPlay(), {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: { target: { type: "UNIT", playerId: "P2", unitId: "enemy" } }
    });
    expect(skipped.priorityPlayerId).toBe(chosen.priorityPlayerId);
    expect(skipped.activePlayerId).toBe(chosen.activePlayerId);
    expect(skipped.phase).toBe(chosen.phase);
  });

  it("cancels an unplayed spell without spending mana or passing priority", () => {
    const targetedSpell: CardDefinition = {
      id: "cancel-test-spell",
      name: "Targeted Spell",
      type: "spell",
      cost: 2,
      abilities: [{
        id: "targeted-spell-cast",
        targets: [{ id: "victim", kind: "ENEMY_UNIT", required: true }],
        effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "victim" }]
      }]
    };
    let state = started();
    state.players.P1.hand = [createCardInstance(targetedSpell, "P1", "spell")];
    state.players.P1.mana = 3;
    state = applyAction(state, {
      type: "PLAY_SPELL", playerId: "P1", cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });
    expect(state.pendingChoice).toBeDefined();
    state = applyAction(state, { type: "CANCEL_PENDING_CHOICE", playerId: "P1" });
    expect(state.pendingChoice).toBeUndefined();
    expect(state.players.P1.hand.map((card) => card.instanceId)).toEqual(["spell"]);
    expect(state.players.P1.mana).toBe(3);
    expect(state.priorityPlayerId).toBe("P1");
  });
});
