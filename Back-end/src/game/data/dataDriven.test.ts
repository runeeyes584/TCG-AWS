import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  createUnitInstance,
  isChampionCard,
  isUnitCard
} from "../cards";
import {
  getCardDefinition,
  hasCard,
  listCards,
  registerCardDefinition
} from "../cardRegistry";
import cardsJson from "./cards.json";
import { applyAction, createInitialGameState } from "../engine";
import { CardDefinition, GameValidationError, PlayerId } from "../types";

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

  it("accepts lowercase champion card types", () => {
    const champion: CardDefinition = {
      id: "data-lowercase-champion",
      name: "Lowercase Champion",
      type: "champion",
      cost: 1,
      attack: 2,
      health: 3
    };

    expect(registerCardDefinition(champion)).toMatchObject(champion);
    expect(getCardDefinition(champion.id).type).toBe("champion");
  });

  it("rejects uppercase CHAMPION card types", () => {
    const invalidChampion = {
      id: "data-uppercase-champion",
      name: "Uppercase Champion",
      type: "CHAMPION",
      cost: 1,
      attack: 2,
      health: 3
    } as unknown as CardDefinition;

    expect(() => registerCardDefinition(invalidChampion)).toThrow(
      "Invalid card type: CHAMPION"
    );
  });

  it("card type helpers only accept lowercase card types", () => {
    const champion: CardDefinition = {
      id: "data-helper-champion",
      name: "Helper Champion",
      type: "champion",
      cost: 1,
      attack: 2,
      health: 3
    };
    const uppercaseChampion = {
      ...champion,
      id: "data-helper-uppercase",
      type: "CHAMPION"
    } as unknown as CardDefinition;

    expect(isChampionCard(champion)).toBe(true);
    expect(isChampionCard(uppercaseChampion)).toBe(false);
    expect(isUnitCard(unit)).toBe(true);
    expect(isUnitCard(champion)).toBe(true);
  });

  it("JSON card data contains no uppercase CardType values", () => {
    const validTypes = new Set(["unit", "spell", "champion"]);
    expect((cardsJson as Array<{ type: string }>).every((card) => validTypes.has(card.type))).toBe(true);
  });

  it("normalizes legacy triggers into abilities when registered", () => {
    const legacyCard: CardDefinition = {
      id: "data-legacy-trigger-card",
      name: "Legacy Trigger Card",
      type: "unit",
      cost: 1,
      attack: 1,
      health: 1,
      triggers: [
        {
          id: "legacy-draw",
          sourceId: "",
          event: "UNIT_SUMMONED",
          effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
        }
      ]
    };

    const normalized = registerCardDefinition(legacyCard);

    expect(normalized.triggers).toBeUndefined();
    expect(normalized.abilities).toContainEqual({
      id: "legacy-trigger:legacy-draw",
      when: { event: "UNIT_SUMMONED" },
      runtimeCondition: undefined,
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    });
  });

  it("does not duplicate a legacy trigger when an equivalent ability exists", () => {
    const normalized = registerCardDefinition({
      id: "data-legacy-and-ability",
      name: "Legacy And Ability",
      type: "unit",
      cost: 1,
      attack: 1,
      health: 1,
      abilities: [
        {
          id: "legacy-trigger:same-trigger",
          when: { event: "UNIT_SUMMONED" },
          effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
        }
      ],
      triggers: [
        {
          id: "same-trigger",
          sourceId: "",
          event: "UNIT_SUMMONED",
          effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
        }
      ]
    });

    expect(normalized.abilities).toHaveLength(1);
  });

  it("cards.json contains no legacy triggers fields", () => {
    expect(JSON.stringify(cardsJson)).not.toContain('"triggers"');
  });

  it("CardRegistry accepts valid spellSpeed values", () => {
    for (const spellSpeed of ["burst", "fast", "slow"] as const) {
      const definition = registerCardDefinition({
        id: `data-${spellSpeed}-spell`,
        name: `${spellSpeed} spell`,
        type: "spell",
        cost: 0,
        spellSpeed,
        effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
      });

      expect(definition.spellSpeed).toBe(spellSpeed);
    }
  });

  it("rejects invalid spellSpeed values for spell cards", () => {
    expect(() =>
      registerCardDefinition({
        id: "data-invalid-speed",
        name: "Invalid Speed",
        type: "spell",
        cost: 0,
        spellSpeed: "instant",
        effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
      } as unknown as CardDefinition)
    ).toThrow("Invalid spell speed: instant");
  });

  it("non-spell cards do not require spellSpeed", () => {
    const definition = registerCardDefinition({
      id: "data-no-speed-unit",
      name: "No Speed Unit",
      type: "unit",
      cost: 1,
      attack: 1,
      health: 1
    });

    expect(definition.spellSpeed).toBeUndefined();
  });

  it("a migrated legacy trigger fires exactly once at runtime", () => {
    const legacyDrawUnit: CardDefinition = {
      id: "data-runtime-legacy-draw",
      name: "Runtime Legacy Draw",
      type: "unit",
      cost: 0,
      attack: 1,
      health: 1,
      triggers: [
        {
          id: "runtime-draw",
          sourceId: "",
          event: "UNIT_SUMMONED",
          effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
        }
      ]
    };
    let state = startedGame();
    state.players.P1.hand = [card(legacyDrawUnit, "P1", "legacy-draw-unit")];
    state.players.P1.mana = 10;
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "legacy-draw-unit"
    });

    expect(state.players.P1.deck).toHaveLength(deckBefore - 1);
    expect(
      state.visualEvents.filter(
        (event) =>
          event.type === "TRIGGER_ACTIVATED" &&
          event.sourceId === "legacy-draw-unit"
      )
    ).toHaveLength(1);
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
    expect(getCardDefinition(unitInstance.cardId).id).toBe(unitInstance.cardId);
  });

  it("CardInstance stores only instanceId, cardId, and ownerId", () => {
    const instance = card(unit, "P1", "plain-card");

    expect(instance).toEqual({
      instanceId: "plain-card",
      cardId: "data-test-unit",
      ownerId: "P1"
    });
    expect(Object.keys(instance)).toEqual(["instanceId", "cardId", "ownerId"]);
  });

  it("createUnitInstance derives runtime stats and keywords from CardRegistry", () => {
    const toughUnit: CardDefinition = {
      ...unit,
      id: "data-test-tough-unit",
      attack: 4,
      health: 5,
      keywords: ["TOUGH"]
    };

    const instance = createUnitInstance(card(toughUnit, "P1", "tough"));

    expect(instance).toMatchObject({
      instanceId: "tough",
      cardId: "data-test-tough-unit",
      ownerId: "P1",
      attack: 4,
      maxHealth: 5,
      damage: 0,
      keywords: ["TOUGH"]
    });
    expect(Object.keys(instance)).not.toContain("definition");
  });

  it("GraveyardEntry stores cardId instead of a full definition", () => {
    const destroySpell: CardDefinition = {
      id: "data-kill",
      name: "Data Kill",
      type: "spell",
      cost: 0,
      effects: [{ type: "DEAL_DAMAGE", amount: 5, target: "ENEMY_UNIT" }]
    };
    let state = startedGame();
    state.players.P1.hand = [card(destroySpell, "P1", "kill")];
    state.players.P2.board = [createUnitInstance(card(unit, "P2", "victim"))];

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "kill",
      target: { type: "UNIT", playerId: "P2", unitId: "victim" }
    });

    expect(state.players.P2.graveyard[0]).toMatchObject({
      instanceId: "victim",
      cardId: "data-test-unit",
      ownerId: "P2"
    });
    expect(Object.keys(state.players.P2.graveyard[0])).not.toContain("definition");
    expect(Object.keys(state.players.P2.graveyard[0])).not.toContain("cardCode");
  });

  it("REVIVE effect restores a unit using graveyard cardId lookup", () => {
    const reviveSpell: CardDefinition = {
      id: "data-revive",
      name: "Data Revive",
      type: "spell",
      cost: 0,
      effects: [{ type: "REVIVE_CARD", target: "ALLY_GRAVEYARD" }]
    };
    let state = startedGame();
    state.players.P1.graveyard = [
      {
        id: "fallen-gy",
        instanceId: "fallen",
        cardId: "data-test-unit",
        ownerId: "P1",
        type: "UNIT",
        round: state.round,
        cause: "COMBAT"
      }
    ];
    state.players.P1.hand = [card(reviveSpell, "P1", "revive")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "revive",
      target: { type: "GRAVEYARD", playerId: "P1", cardInstanceId: "fallen" }
    });

    const revivedCard = state.players.P1.hand.find(c => c.cardId === "data-test-unit");
    expect(revivedCard).toBeDefined();
    expect(state.players.P1.graveyard.map((entry) => entry.cardId)).toEqual([
      "data-revive"
    ]);
  });

  it("JSON.stringify(GameState) does not include CardDefinition payloads", () => {
    let state = startedGame();
    const handCard = state.players.P1.hand[0];
    state.players.P1.mana = 10;
    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: handCard.instanceId
    });

    const serialized = JSON.stringify(state);
    expect(serialized).not.toContain("definition");
    expect(serialized).not.toContain("Data Test Unit");
    expect(serialized).toContain("data-test-unit");
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
    expect(getCardDefinition(state.players.P1.board[0].cardId).name).toBe("Sparksmith Adept");
  });

   it("Cat-Baby-with-bow is an onPlay ability and Cat-Banana is a summon ability", () => {
    const baby = getCardDefinition("Cat-Baby-with-bow");
    const banana = getCardDefinition("Cat-Banana");
    expect(baby.abilities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          onPlay: true,
          targets: [
            expect.objectContaining({
              id: "target",
              kind: "ENEMY_UNIT",
              required: true
            })
          ],
          effects: [
            expect.objectContaining({
              type: "DEBUFF_UNIT",
              target: "target",
              duration: "PERMANENT"
            })
          ]
        })
      ])
    );
  }); 
  
  
  
  it("Cat-Baby-with-bow summons first, then creates pendingChoice when an effect target exists", () => {
    const cat = getCardDefinition("Cat-Baby-with-bow");
    let state = startedGame();
    state.players.P1.hand = [card(cat, "P1", "cat")];
    state.players.P1.mana = 10;
    state.players.P2.board = [createUnitInstance(card(unit, "P2", "enemy"))];
    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "cat"
    });
    // Unit summon is not gated by the on-play effect.
    expect(state.players.P1.board).toHaveLength(1);
    expect(state.players.P1.board[0].instanceId).toBe("cat");
    expect(state.players.P1.hand).toHaveLength(0);
    expect(state.pendingChoice).toBeDefined();
    expect(state.pendingChoice!.abilityId).toBe("Cat-Baby-with-bow-play");
    expect(state.pendingChoice!.requiredTargets).toEqual([
      expect.objectContaining({ id: "target", kind: "ENEMY_UNIT" })
    ]);
    // No debuff yet
    expect(state.players.P2.board[0].modifiers).toHaveLength(0);
  });

  it("Cat-Baby-with-bow still summons when its on-play effect has no valid target", () => {
    const cat = getCardDefinition("Cat-Baby-with-bow");
    let state = startedGame();
    state.players.P1.hand = [card(cat, "P1", "cat")];
    state.players.P1.mana = 10;
    state.players.P2.board = [];

    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "cat"
    });

    expect(state.players.P1.board).toHaveLength(1);
    expect(state.players.P1.board[0].instanceId).toBe("cat");
    expect(state.players.P1.hand).toHaveLength(0);
    expect(state.pendingChoice).toBeUndefined();
  });
  it("Cat-Baby-with-bow applies permanent -1 attack debuff after target selection", () => {
    const cat = getCardDefinition("Cat-Baby-with-bow");
    let state = startedGame();
    state.players.P1.hand = [card(cat, "P1", "cat")];
    state.players.P1.mana = 10;
    state.players.P2.board = [createUnitInstance(card(unit, "P2", "enemy"))];
    // Play the unit -> summons and creates pendingChoice for the on-play effect
    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "cat"
    });
    // Submit target -> debuff applied
    state = applyAction(state, {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: {
        target: { type: "UNIT", playerId: "P2", unitId: "enemy" }
      }
    });
    expect(state.pendingChoice).toBeUndefined();
    expect(state.players.P1.board[0].modifiers).toHaveLength(0);
    expect(state.players.P2.board[0].modifiers).toHaveLength(1);
    expect(state.players.P2.board[0].modifiers[0]).toMatchObject({
      attackDelta: -1,
      duration: "PERMANENT"
    });
  });

  it("Cat-Baby-with-bow cancel clears pending choice but keeps the summoned unit", () => {
    const cat = getCardDefinition("Cat-Baby-with-bow");
    let state = startedGame();
    state.players.P1.hand = [card(cat, "P1", "cat")];
    state.players.P1.mana = 10;
    state.players.P2.board = [createUnitInstance(card(unit, "P2", "enemy"))];

    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "cat"
    });

    expect(state.pendingChoice).toBeDefined();
    expect(state.priorityPlayerId).toBe("P1");
    expect(state.players.P1.board).toHaveLength(1);

    state = applyAction(state, {
      type: "CANCEL_PENDING_CHOICE",
      playerId: "P1"
    });

    expect(state.pendingChoice).toBeUndefined();
    expect(state.players.P1.board).toHaveLength(1);
    expect(state.players.P1.board[0].instanceId).toBe("cat");
    expect(state.players.P1.hand).toHaveLength(0);
    expect(state.players.P1.mana).toBe(9);
    expect(state.players.P2.board[0].modifiers).toHaveLength(0);
    expect(state.priorityPlayerId).toBe("P1");
    expect(state.activePlayerId).toBe("P1");
  });

  it("Cat-Baby-with-bow permanent debuff survives end of turn and round", () => {
    const cat = getCardDefinition("Cat-Baby-with-bow");
    let state = startedGame();
    state.players.P1.hand = [card(cat, "P1", "cat")];
    state.players.P1.mana = 10;
    state.players.P2.board = [createUnitInstance(card(unit, "P2", "enemy"))];
    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "cat"
    });
    state = applyAction(state, {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: {
        target: { type: "UNIT", playerId: "P2", unitId: "enemy" }
      }
    });
    // After submit, priority returned to P2 (playUnit already passed priority)
    // P2 ends turn
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    expect(state.players.P2.board[0].modifiers).toHaveLength(1);
    expect(state.players.P2.board[0].modifiers[0].duration).toBe("PERMANENT");
    // P1 ends turn -> both passed -> new round
    state = applyAction(state, { type: "END_TURN", playerId: "P1" });
    expect(state.players.P2.board[0].modifiers).toHaveLength(1);
    expect(state.players.P2.board[0].modifiers[0].duration).toBe("PERMANENT");
  });
  it("Cat-Banana debuffs an enemy unit on summon", () => {
    const banana = getCardDefinition("Cat-Banana");
    let state = startedGame();
  });
});
