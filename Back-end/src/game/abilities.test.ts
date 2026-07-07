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

function handCardTarget(playerId: PlayerId, cardInstanceId: string) {
  return { type: "HAND_CARD" as const, playerId, cardInstanceId };
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

  it("ALLY_HAND_CARD accepts a card in own hand", () => {
    const ability: Ability = {
      id: "target-own-hand",
      targets: [{ id: "discardTarget", kind: "ALLY_HAND_CARD" }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();
    state.players.P1.hand = [card(unit, "P1", "discard-me")];

    expect(() =>
      executeAbility(state, ability, {
        sourceId: "source",
        sourcePlayerId: "P1",
        selectedTargets: { discardTarget: handCardTarget("P1", "discard-me") }
      })
    ).not.toThrow();
  });

  it("ALLY_HAND_CARD rejects a unit on board", () => {
    const ability: Ability = {
      id: "reject-board-unit",
      targets: [{ id: "discardTarget", kind: "ALLY_HAND_CARD" }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    let state = startedGame();
    state = withBoard(state, "P1", ["ally"]);

    expect(() =>
      executeAbility(state, ability, {
        sourceId: "source",
        sourcePlayerId: "P1",
        selectedTargets: {
          discardTarget: { type: "UNIT", playerId: "P1", unitId: "ally" }
        }
      })
    ).toThrow(GameValidationError);
  });

  it("ALLY_HAND_CARD rejects a missing hand card", () => {
    const ability: Ability = {
      id: "reject-missing-hand-card",
      targets: [{ id: "discardTarget", kind: "ALLY_HAND_CARD" }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();

    expect(() =>
      executeAbility(state, ability, {
        sourceId: "source",
        sourcePlayerId: "P1",
        selectedTargets: { discardTarget: handCardTarget("P1", "missing") }
      })
    ).toThrow(GameValidationError);
  });

  it("ALLY_HAND_CARD rejects an enemy hand card", () => {
    const ability: Ability = {
      id: "reject-enemy-hand-card",
      targets: [{ id: "discardTarget", kind: "ALLY_HAND_CARD" }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();
    state.players.P2.hand = [card(unit, "P2", "enemy-card")];

    expect(() =>
      executeAbility(state, ability, {
        sourceId: "source",
        sourcePlayerId: "P1",
        selectedTargets: { discardTarget: handCardTarget("P2", "enemy-card") }
      })
    ).toThrow(GameValidationError);
  });

  it("DISCARD cost removes the selected HAND_CARD and moves it to graveyard", () => {
    const ability: Ability = {
      id: "discard-to-draw",
      targets: [{ id: "discardTarget", kind: "ALLY_HAND_CARD" }],
      costs: [{ type: "DISCARD", target: "discardTarget" }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const state = startedGame();
    state.players.P1.hand = [card(unit, "P1", "discard-me")];

    executeAbility(state, ability, {
      sourceId: "source",
      sourcePlayerId: "P1",
      selectedTargets: { discardTarget: handCardTarget("P1", "discard-me") }
    });

    expect(state.players.P1.hand).toHaveLength(0);
    expect(state.players.P1.graveyard[0]).toMatchObject({
      instanceId: "discard-me",
      cardId: "unit",
      cause: "DISCARD"
    });
  });

  it("DISCARD cost does not accept UNIT targets anymore", () => {
    const ability: Ability = {
      id: "bad-discard",
      costs: [{ type: "DISCARD", target: "discardTarget" }],
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    let state = startedGame();
    state = withBoard(state, "P1", ["ally"]);

    expect(() =>
      executeAbility(state, ability, {
        sourceId: "source",
        sourcePlayerId: "P1",
        selectedTargets: {
          discardTarget: { type: "UNIT", playerId: "P1", unitId: "ally" }
        }
      })
    ).toThrow(GameValidationError);
  });

  it("a sample ability can discard one hand card to draw cards", () => {
    const forbiddenResearch: Ability = {
      id: "forbidden-research-cast",
      targets: [{ id: "discardTarget", kind: "ALLY_HAND_CARD" }],
      costs: [{ type: "DISCARD", target: "discardTarget" }],
      effects: [{ type: "DRAW_CARD", count: 2, target: "SELF" }]
    };
    const state = startedGame();
    state.players.P1.hand = [card(unit, "P1", "discard-me")];
    const deckBefore = state.players.P1.deck.length;

    executeAbility(state, forbiddenResearch, {
      sourceId: "forbidden-research",
      sourcePlayerId: "P1",
      selectedTargets: { discardTarget: handCardTarget("P1", "discard-me") }
    });
    resolveEffectQueue(state);

    expect(state.players.P1.graveyard.map((entry) => entry.instanceId)).toContain("discard-me");
    expect(state.players.P1.deck).toHaveLength(deckBefore - 2);
  });
});
