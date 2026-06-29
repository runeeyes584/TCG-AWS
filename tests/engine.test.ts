import { describe, expect, it } from "vitest";
import {
  applyAction,
  CardDefinition,
  createCardInstance,
  createInitialGameState,
  GameState,
  GameValidationError,
  PlayerId
} from "../src/engine";

const soldier: CardDefinition = {
  id: "soldier",
  name: "Vanguard Soldier",
  cost: 1,
  type: "unit",
  attack: 2,
  health: 2
};

const bruiser: CardDefinition = {
  id: "bruiser",
  name: "Arena Bruiser",
  cost: 2,
  type: "unit",
  attack: 3,
  health: 3
};

function card(definition: CardDefinition, ownerId: PlayerId, id: string) {
  return createCardInstance(definition, ownerId, id);
}

function deck(ownerId: PlayerId, count: number, prefix = ownerId) {
  return Array.from({ length: count }, (_, index) =>
    card(soldier, ownerId, `${prefix}-${index}`)
  );
}

function startedGame(): GameState {
  return applyAction(createInitialGameState(deck("P1", 10), deck("P2", 10)), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
}

describe("engine reducer", () => {
  it("starts the game and draws opening hands", () => {
    const state = startedGame();

    expect(state.started).toBe(true);
    expect(state.round).toBe(1);
    expect(state.players.P1.hand).toHaveLength(4);
    expect(state.players.P2.hand).toHaveLength(4);
    expect(state.players.P1.deck).toHaveLength(6);
    expect(state.players.P2.deck).toHaveLength(6);
  });

  it("draws cards for a player", () => {
    const state = applyAction(startedGame(), {
      type: "DRAW_CARD",
      playerId: "P1",
      count: 2
    });

    expect(state.players.P1.hand).toHaveLength(6);
    expect(state.players.P1.deck).toHaveLength(4);
  });

  it("refreshes mana and banks unused mana as spell mana at round start", () => {
    let state = startedGame();
    state = applyAction(state, {
      type: "START_ROUND"
    });

    expect(state.round).toBe(2);
    expect(state.players.P1.maxMana).toBe(2);
    expect(state.players.P1.mana).toBe(2);
    expect(state.players.P1.spellMana).toBe(1);
    expect(state.attackTokenPlayerId).toBe("P2");
  });

  it("plays a unit from hand to board and spends mana", () => {
    const initial = startedGame();
    const unitCardId = initial.players.P1.hand[0].instanceId;
    const state = applyAction(initial, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: unitCardId
    });

    expect(state.players.P1.hand).toHaveLength(3);
    expect(state.players.P1.board).toHaveLength(1);
    expect(state.players.P1.board[0]).toMatchObject({
      instanceId: unitCardId,
      attack: 2,
      health: 2
    });
    expect(state.players.P1.mana).toBe(0);
  });

  it("rejects invalid plays before mutating state", () => {
    const initial = startedGame();

    expect(() =>
      applyAction(initial, {
        type: "PLAY_UNIT",
        playerId: "P2",
        cardInstanceId: initial.players.P2.hand[0].instanceId
      })
    ).toThrow(GameValidationError);
    expect(initial.players.P2.hand).toHaveLength(4);
  });

  it("resolves blocked combat and moves dead units to graveyard", () => {
    let state = createInitialGameState(deck("P1", 10), deck("P2", 10));
    state = applyAction(state, { type: "START_GAME", firstPlayerId: "P1" });
    state = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          board: [
            {
              instanceId: "attacker",
              definition: soldier,
              ownerId: "P1",
              attack: 2,
              health: 2,
              maxHealth: 2,
              exhausted: false,
              attacking: false
            }
          ]
        },
        P2: {
          ...state.players.P2,
          board: [
            {
              instanceId: "blocker",
              definition: soldier,
              ownerId: "P2",
              attack: 2,
              health: 2,
              maxHealth: 2,
              exhausted: false,
              attacking: false
            }
          ]
        }
      }
    };

    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker"
    });
    state = applyAction(
      { ...state, priorityPlayerId: "P2" },
      {
        type: "DECLARE_BLOCKER",
        playerId: "P2",
        blockerUnitId: "blocker",
        attackerUnitId: "attacker"
      }
    );
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P1.board).toHaveLength(0);
    expect(state.players.P2.board).toHaveLength(0);
    expect(state.players.P1.graveyard[0].instanceId).toBe("attacker");
    expect(state.players.P2.graveyard[0].instanceId).toBe("blocker");
    expect(state.players.P2.nexusHp).toBe(20);
  });

  it("resolves unblocked combat against the nexus and declares a winner", () => {
    let state = startedGame();
    state = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          board: [
            {
              instanceId: "finisher",
              definition: bruiser,
              ownerId: "P1",
              attack: 20,
              health: 3,
              maxHealth: 3,
              exhausted: false,
              attacking: false
            }
          ]
        }
      }
    };

    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "finisher"
    });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P2.nexusHp).toBe(0);
    expect(state.winnerId).toBe("P1");
    expect(() =>
      applyAction(state, {
        type: "DRAW_CARD",
        playerId: "P1"
      })
    ).toThrow(GameValidationError);
  });
});
