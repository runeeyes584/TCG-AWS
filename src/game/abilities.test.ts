import { describe, expect, it } from "vitest";
import { executeAbility } from "./abilities";
import { createCardInstance, createUnitInstance, getUnitAttack } from "./cards";
import { applyAction, createInitialGameState } from "./engine";
import { resolveEffectQueue } from "./effects";
import {
  Ability,
  CardDefinition,
  GameState,
  GameValidationError,
  PlayerId
} from "./types";

const unit: CardDefinition = {
  id: "unit",
  name: "Unit",
  cost: 1,
  type: "unit",
  attack: 2,
  health: 2
};

const spellShell: CardDefinition = {
  id: "ability-spell",
  name: "Ability Spell",
  cost: 0,
  type: "spell",
  abilities: []
};

function card(definition: CardDefinition, ownerId: PlayerId, id: string) {
  return createCardInstance(definition, ownerId, id);
}

function deck(ownerId: PlayerId) {
  return Array.from({ length: 10 }, (_, index) => card(unit, ownerId, `${ownerId}-${index}`));
}

function startedGame(): GameState {
  return applyAction(createInitialGameState(deck("P1"), deck("P2")), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
}

function withBoard(state: GameState, playerId: PlayerId, ids: string[]): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        board: ids.map((id) => createUnitInstance(card(unit, playerId, id)))
      }
    }
  };
}

describe("ability system", () => {
  it("fails when a condition is not met", () => {
    const ability: Ability = {
      id: "expensive",
      conditions: [{ type: "HAS_MANA", amount: 9 }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();

    expect(() =>
      executeAbility(state, ability, { sourceId: "source", sourcePlayerId: "P1" })
    ).toThrow(GameValidationError);
  });

  it("fails when a cost cannot be paid", () => {
    const ability: Ability = {
      id: "costly",
      costs: [{ type: "PAY_MANA", amount: 9 }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();

    expect(() =>
      executeAbility(state, ability, { sourceId: "source", sourcePlayerId: "P1" })
    ).toThrow(GameValidationError);
  });

  it("validates declared targets", () => {
    const spell: CardDefinition = {
      ...spellShell,
      abilities: [
        {
          id: "damage-enemy",
          targets: [{ id: "target", kind: "ENEMY_UNIT" }],
          effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "target" }]
        }
      ]
    };
    let state = startedGame();
    state = withBoard(state, "P1", ["ally"]);
    state.players.P1.hand = [card(spell, "P1", "spell")];

    expect(() =>
      applyAction(state, {
        type: "PLAY_SPELL",
        playerId: "P1",
        cardInstanceId: "spell",
        target: { type: "UNIT", playerId: "P1", unitId: "ally" }
      })
    ).toThrow(GameValidationError);
  });

  it("executes a no-trigger spell ability successfully", () => {
    const spell: CardDefinition = {
      ...spellShell,
      abilities: [
        {
          id: "damage-enemy",
          targets: [{ id: "target", kind: "ENEMY_UNIT" }],
          effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "target" }]
        }
      ]
    };
    let state = startedGame();
    state = withBoard(state, "P2", ["enemy"]);
    state.players.P1.hand = [card(spell, "P1", "spell")];

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "enemy" }
    });

    expect(state.players.P2.board[0].damage).toBe(1);
  });

  it("supports multiple effects", () => {
    const spell: CardDefinition = {
      ...spellShell,
      abilities: [
        {
          id: "damage-and-draw",
          targets: [{ id: "target", kind: "ENEMY_UNIT" }],
          effects: [
            { type: "DEAL_DAMAGE", amount: 1, target: "target" },
            { type: "DRAW_CARD", count: 1, target: "SELF" }
          ]
        }
      ]
    };
    let state = startedGame();
    state = withBoard(state, "P2", ["enemy"]);
    state.players.P1.hand = [card(spell, "P1", "spell")];
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "enemy" }
    });

    expect(state.players.P2.board[0].damage).toBe(1);
    expect(state.players.P1.deck).toHaveLength(deckBefore - 1);
  });

  it("supports multiple costs before enqueueing effects", () => {
    const ability: Ability = {
      id: "paid-draw",
      costs: [
        { type: "PAY_MANA", amount: 1 },
        { type: "PAY_HEALTH", amount: 2 }
      ],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();
    state.players.P1.mana = 3;
    const deckBefore = state.players.P1.deck.length;

    executeAbility(state, ability, { sourceId: "source", sourcePlayerId: "P1" });
    expect(state.players.P1.mana).toBe(2);
    expect(state.players.P1.nexusHp).toBe(18);
    resolveEffectQueue(state);
    expect(state.players.P1.deck).toHaveLength(deckBefore - 1);
  });

  it("preserves effect queue ordering", () => {
    const ability: Ability = {
      id: "ordered",
      effects: [
        { type: "DEAL_DAMAGE", amount: 3, target: "ENEMY_NEXUS" },
        { type: "HEAL", amount: 2, target: "ENEMY_NEXUS" }
      ]
    };
    const state = startedGame();

    executeAbility(state, ability, { sourceId: "source", sourcePlayerId: "P1" });
    expect(state.effectQueue.map((queued) => queued.effect.type)).toEqual([
      "DEAL_DAMAGE",
      "HEAL"
    ]);
  });

  it("executes triggered abilities through existing events", () => {
    const channeler: CardDefinition = {
      id: "channeler",
      name: "Channeler",
      cost: 1,
      type: "unit",
      attack: 1,
      health: 3,
      abilities: [
        {
          id: "spell-buff",
          when: { event: "SPELL_CAST" },
          targets: [{ id: "self", kind: "SELF" }],
          effects: [
            { type: "BUFF_UNIT", attack: 2, health: 0, target: "self", duration: "THIS_ROUND" }
          ]
        }
      ]
    };
    const spell: CardDefinition = {
      ...spellShell,
      abilities: [
        {
          id: "draw",
          effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
        }
      ]
    };
    let state = startedGame();
    state.players.P1.board = [createUnitInstance(card(channeler, "P1", "channeler"))];
    state.players.P1.hand = [card(spell, "P1", "spell")];

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(getUnitAttack(state.players.P1.board[0])).toBe(3);
    expect(state.visualEvents.some((event) => event.type === "TRIGGER_ACTIVATED")).toBe(true);
  });
});
