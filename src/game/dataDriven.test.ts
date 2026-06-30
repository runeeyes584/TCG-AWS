import { describe, expect, it } from "vitest";
import { createCardInstance } from "./cards";
import { getCardDefinition, hasCard, listCards } from "./cardRegistry";
import { applyAction, createInitialGameState } from "./engine";
import { CardDefinition, GameValidationError, PlayerId } from "./types";

const unit: CardDefinition = {
  id: "data-test-unit",
  name: "Data Test Unit",
  type: "unit",
  cost: 1,
  attack: 2,
  health: 2
};

function card(definition: CardDefinition, ownerId: PlayerId, id: string) {
  return createCardInstance(definition, ownerId, id);
}

function deck(ownerId: PlayerId, count = 10) {
  return Array.from({ length: count }, (_, index) =>
    card(unit, ownerId, `${ownerId}-deck-${index}`)
  );
}

function startedGame() {
  return applyAction(createInitialGameState(deck("P1"), deck("P2")), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
}

describe("data-driven card registry and operations", () => {
  it("CardRegistry loads cards from JSON", () => {
    expect(hasCard("sparksmith")).toBe(true);
    expect(getCardDefinition("sparksmith")).toMatchObject({
      id: "sparksmith",
      name: "Sparksmith Adept",
      type: "unit"
    });
    expect(listCards().length).toBeGreaterThan(10);
  });

  it("throws GameValidationError for invalid cardId", () => {
    expect(() => getCardDefinition("missing-card")).toThrow(GameValidationError);
  });

  it("GameState card and unit instances store cardId without an own definition copy", () => {
    let state = startedGame();
    const handCard = state.players.P1.hand[0];
    expect(handCard.cardId).toBeTruthy();
    expect(Object.keys(handCard)).toEqual(
      expect.arrayContaining(["instanceId", "cardId", "ownerId"])
    );
    expect(Object.keys(handCard)).not.toContain("definition");
    expect(JSON.stringify(handCard)).not.toContain("definition");

    state.players.P1.mana = 10;
    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: handCard.instanceId
    });

    const unitInstance = state.players.P1.board[0];
    expect(unitInstance.cardId).toBeTruthy();
    expect(Object.keys(unitInstance)).not.toContain("definition");
    expect(JSON.stringify(unitInstance)).not.toContain("definition");
    expect(unitInstance.definition.id).toBe(unitInstance.cardId);
  });

  it("DRAW effect resolves through drawCards operation behavior", () => {
    const drawSpell: CardDefinition = {
      id: "data-draw",
      name: "Data Draw",
      type: "spell",
      cost: 0,
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    let state = startedGame();
    state.players.P1.hand = [card(drawSpell, "P1", "draw")];
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "draw",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.players.P1.deck).toHaveLength(deckBefore - 1);
    expect(state.visualEvents).toContainEqual({ type: "DRAW", playerId: "P1", count: 1 });
  });

  it("DISCARD effect resolves through discardCards operation behavior", () => {
    const discardSpell: CardDefinition = {
      id: "data-discard",
      name: "Data Discard",
      type: "spell",
      cost: 0,
      effects: [{ type: "DISCARD_CARD", count: 1, target: "SELF" }]
    };
    let state = startedGame();
    state.players.P1.hand = [
      card(discardSpell, "P1", "discard-spell"),
      card(unit, "P1", "discard-me")
    ];

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "discard-spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.players.P1.graveyard.map((entry) => entry.instanceId)).toContain(
      "discard-me"
    );
  });

  it("DAMAGE effect resolves through dealDamage operation behavior", () => {
    const damageSpell: CardDefinition = {
      id: "data-damage",
      name: "Data Damage",
      type: "spell",
      cost: 0,
      effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_UNIT" }]
    };
    let state = startedGame();
    state.players.P1.hand = [card(damageSpell, "P1", "damage")];
    state.players.P2.board = [
      {
        instanceId: "target",
        cardId: unit.id,
        ownerId: "P2",
        attack: 2,
        maxHealth: 2,
        damage: 0,
        keywords: [],
        temporaryKeywords: [],
        modifiers: [],
        exhausted: false,
        attacking: false,
        triggers: []
      } as any
    ];

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "damage",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });

    expect(state.players.P2.board[0].damage).toBe(1);
    expect(state.visualEvents).toContainEqual({
      type: "DAMAGE",
      targetId: "target",
      amount: 1,
      isNexus: false
    });
  });

  it("existing sample cards still work after moving to JSON", () => {
    const sparksmith = getCardDefinition("sparksmith");
    let state = applyAction(
      createInitialGameState([sparksmith, ...deck("P1")], deck("P2"), 7),
      { type: "START_GAME", firstPlayerId: "P1" }
    );
    state.players.P1.hand = [card(sparksmith, "P1", "sparksmith-card")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "sparksmith-card"
    });

    expect(state.players.P1.board[0].cardId).toBe("sparksmith");
    expect(state.players.P1.board[0].definition.name).toBe("Sparksmith Adept");
  });
});
