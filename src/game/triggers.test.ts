import { describe, expect, it } from "vitest";
import { applyAction, createInitialGameState } from "./engine";
import { createCardInstance, getUnitAttack, getUnitMaxHealth } from "./cards";
import { CardDefinition, GameState, PlayerId } from "./types";
import { sampleUnitCards, sampleSpellCards } from "./sampleCards";

function card(definitionId: string, ownerId: PlayerId, id: string) {
  const definition = sampleUnitCards.find(c => c.id === definitionId) ?? sampleSpellCards.find(c => c.id === definitionId);
  if (!definition) throw new Error(`Card ${definitionId} not found`);
  return createCardInstance(definition, ownerId, id);
}

function deck(ownerId: PlayerId, count: number, prefix = ownerId) {
  return Array.from({ length: count }, (_, index) =>
    card("sparksmith", ownerId, `${prefix}-${index}`)
  );
}

function startedGame(): GameState {
  return applyAction(createInitialGameState(deck("P1", 10), deck("P2", 10)), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
}

function withHand(
  state: GameState,
  playerId: PlayerId,
  cards: ReturnType<typeof createCardInstance>[]
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        hand: cards,
        mana: 10,
        spellMana: 3
      }
    }
  };
}

describe("Trigger System and Effect Queue", () => {
  it("On summon: Acolyte of Knowledge draws 1 card", () => {
    let state = startedGame();
    state = withHand(state, "P1", [card("acolyte", "P1", "aco-1")]);
    const initialDeckCount = state.players.P1.deck.length;

    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "aco-1" });
    
    // 1 card drawn from deck, hand has 1 card
    expect(state.players.P1.deck.length).toBe(initialDeckCount - 1);
    expect(state.players.P1.hand.length).toBe(1);
    expect(state.visualEvents.filter(e => e.type === "TRIGGER_ACTIVATED" && e.sourceId === "aco-1")).toHaveLength(1);
  });

  it("On attack: Fierce Striker gains +1 attack THIS_ROUND", () => {
    let state = startedGame();
    state = withHand(state, "P1", [card("fierce-striker", "P1", "fs-1")]);
    // Play fs-1, passes priority to P2
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "fs-1" });
    // P2 passes priority
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    
    // Enter combat
    state = applyAction(state, { type: "DECLARE_ATTACKER", playerId: "P1", unitInstanceId: "fs-1" });
    
    // Check buff
    expect(state.players.P1.board[0].modifiers.length).toBe(1);
    expect(getUnitAttack(state.players.P1.board[0])).toBe(4); // Base 3 + 1
    
    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
    expect(state.players.P1.board[0].modifiers.length).toBe(1);
    expect(getUnitAttack(state.players.P1.board[0])).toBe(4);

    // Resolve combat & end turn
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = applyAction(state, { type: "END_TURN", playerId: "P1" }); // Round ends
    
    // Modifier should be cleaned up
    expect(state.players.P1.board[0].modifiers.length).toBe(0);
    expect(getUnitAttack(state.players.P1.board[0])).toBe(3);
  });

  it("On death: Volatile Bomb damages enemy nexus", () => {
    let state = startedGame();
    state = withHand(state, "P1", [card("volatile-bomb", "P1", "bomb-1")]);
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "bomb-1" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    
    // Use a spell to kill the bomb
    const killSpell: CardDefinition = { id: "kill", name: "Kill", cost: 0, type: "spell", effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "ALLY_UNIT" }] };
    state = withHand(state, "P1", [createCardInstance(killSpell, "P1", "kill-1")]);
    state = applyAction(state, { type: "PLAY_SPELL", playerId: "P1", cardInstanceId: "kill-1", target: { type: "UNIT", playerId: "P1", unitId: "bomb-1" } });
    
    // P2 Nexus took 2 damage
    expect(state.players.P2.nexusHp).toBe(18);
    expect(state.visualEvents.filter(e => e.type === "TRIGGER_ACTIVATED" && e.sourceId === "bomb-1")).toHaveLength(1);
  });

  it("On spell cast: Spellweaver buffs exactly once", () => {
    let state = startedGame();
    state = withHand(state, "P1", [card("spellweaver", "P1", "weaver-1")]);
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "weaver-1" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });

    const drawSpell: CardDefinition = {
      id: "weaver-test-spell",
      name: "Weaver Test Spell",
      cost: 0,
      type: "spell",
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    state = withHand(state, "P1", [createCardInstance(drawSpell, "P1", "spell-1")]);
    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell-1",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.players.P1.board[0].modifiers).toHaveLength(1);
    expect(getUnitAttack(state.players.P1.board[0])).toBe(3);
    expect(getUnitMaxHealth(state.players.P1.board[0])).toBe(3);
    expect(state.visualEvents.filter(e => e.type === "TRIGGER_ACTIVATED" && e.sourceId === "weaver-1")).toHaveLength(1);
  });

  it("Round start: Dawn Healer heals ally nexus", () => {
    let state = startedGame();
    state.players.P1.nexusHp = 15;
    state = withHand(state, "P1", [card("dawn-healer", "P1", "healer-1")]);
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "healer-1" });
    
    // P2 passes, P1 passes -> Round ends, new round starts (Since P1 played a card, P2 had priority, P2 passes, P1 has priority, P1 passes)
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = applyAction(state, { type: "END_TURN", playerId: "P1" });
    
    // Heals for 2 at round start
    expect(state.players.P1.nexusHp).toBe(17);
  });

  it("Trigger Ordering: 2 Echoing Strikes hit nexus in play order", () => {
    let state = startedGame();
    state = withHand(state, "P1", [card("echoing-strike", "P1", "echo-1"), card("echoing-strike", "P1", "echo-2")]);
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "echo-1" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "echo-2" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    
    const triggerSpell: CardDefinition = { id: "trig", name: "Trig", cost: 0, type: "spell", effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "NEXUS" }] };
    state = withHand(state, "P1", [createCardInstance(triggerSpell, "P1", "trig-1")]);
    // The spell targets the enemy nexus
    state = applyAction(state, { type: "PLAY_SPELL", playerId: "P1", cardInstanceId: "trig-1", target: { type: "NEXUS", playerId: "P2" } });
    
    // Both triggers fired, Nexus takes 1+1=2 damage. Plus 1 from spell = 3.
    expect(state.players.P2.nexusHp).toBe(17);
    // Visual events confirm order
    const triggers = state.visualEvents.filter(e => e.type === "TRIGGER_ACTIVATED");
    expect(triggers[0].sourceId).toBe("echo-1");
    expect(triggers[1].sourceId).toBe("echo-2");
  });

  it("Chained Triggers: Death triggers damage, damage triggers buff", () => {
    let state = startedGame();
    // P1 has Bomb (On death, damage enemy nexus)
    // P2 has Nexus Guard (When nexus damaged, gain +1/+1)
    state = withHand(state, "P1", [card("volatile-bomb", "P1", "bomb-1")]);
    state = withHand(state, "P2", [card("nexus-guard", "P2", "guard-1")]);
    
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "bomb-1" });
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P2", cardInstanceId: "guard-1" });
    
    // Now P1 has priority
    // P1 kills bomb
    const killSpell: CardDefinition = { id: "kill", name: "Kill", cost: 0, type: "spell", effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "ALLY_UNIT" }] };
    state = withHand(state, "P1", [createCardInstance(killSpell, "P1", "kill-1")]);
    state = applyAction(state, { type: "PLAY_SPELL", playerId: "P1", cardInstanceId: "kill-1", target: { type: "UNIT", playerId: "P1", unitId: "bomb-1" } });
    
    // Bomb dies -> Nexus damaged -> Guard buffed
    expect(state.players.P2.nexusHp).toBe(18); // 20 - 2 = 18
    expect(getUnitAttack(state.players.P2.board[0])).toBe(5); // 4 + 1
    expect(getUnitMaxHealth(state.players.P2.board[0])).toBe(6); // 5 + 1
  });

  it("Game Over interrupts effect resolution", () => {
    let state = startedGame();
    // P2 Nexus is at 2 HP
    state.players.P2.nexusHp = 2;
    
    // P1 has Bomb (On death, damage enemy nexus)
    // P2 has Nexus Guard (When nexus damaged, gain +1/+1)
    state = withHand(state, "P1", [card("volatile-bomb", "P1", "bomb-1")]);
    state = withHand(state, "P2", [card("nexus-guard", "P2", "guard-1")]);
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "bomb-1" });
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P2", cardInstanceId: "guard-1" });
    
    // P1 kills bomb
    const killSpell: CardDefinition = { id: "kill", name: "Kill", cost: 0, type: "spell", effects: [{ type: "DEAL_DAMAGE", amount: 2, target: "ALLY_UNIT" }] };
    state = withHand(state, "P1", [createCardInstance(killSpell, "P1", "kill-1")]);
    state = applyAction(state, { type: "PLAY_SPELL", playerId: "P1", cardInstanceId: "kill-1", target: { type: "UNIT", playerId: "P1", unitId: "bomb-1" } });
    
    // Bomb dies -> damages nexus to 0 -> Nexus Guard triggers but queue stops because Game Over
    expect(state.winnerId).toBe("P1");
    // Guard should not have buffed
    expect(getUnitAttack(state.players.P2.board[0])).toBe(4);
  });

  it("EVENT_UNIT trigger target resolves to the unit from the event", () => {
    const watcher: CardDefinition = {
      id: "summon-pinger",
      name: "Summon Pinger",
      cost: 0,
      type: "unit",
      attack: 0,
      health: 3,
      triggers: [
        {
          id: "ping-event-unit",
          sourceId: "",
          event: "UNIT_SUMMONED",
          condition: (_state, event) => event.playerId === "P2",
          effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "EVENT_UNIT" }]
        }
      ]
    };
    const target: CardDefinition = {
      id: "target",
      name: "Target",
      cost: 0,
      type: "unit",
      attack: 1,
      health: 2
    };
    let state = startedGame();
    state = withHand(state, "P1", [createCardInstance(watcher, "P1", "watcher")]);
    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "watcher"
    });
    state = withHand(state, "P2", [createCardInstance(target, "P2", "target")]);

    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P2",
      cardInstanceId: "target"
    });

    expect(state.players.P2.board[0].damage).toBe(1);
    expect(state.players.P1.board[0].damage).toBe(0);
  });
});
