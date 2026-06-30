import { describe, it, expect } from "vitest";
import { applyAction, createInitialGameState } from "./engine";
import { createCardInstance, createUnitInstance, getUnitAttack } from "./cards";
import { GameState, CardDefinition, PlayerId, GameAction, UnitInstance } from "./types";

describe("Champion System & Level Up", () => {
  const dummyUnit: CardDefinition = {
    id: "dummy-unit", name: "Dummy Unit", type: "unit", cost: 1, attack: 1, health: 1
  };

  function deck(ownerId: PlayerId, count = 10) {
    return Array.from({ length: count }, (_, index) =>
      createCardInstance(dummyUnit, ownerId, `${ownerId}-deck-${index}`)
    );
  }

  function started(registry: Record<string, CardDefinition> = {}) {
    return applyAction(
      createInitialGameState(deck("P1"), deck("P2"), 123, registry),
      { type: "START_GAME", firstPlayerId: "P1" }
    );
  }

  function withPriority(state: GameState, playerId: PlayerId): GameState {
    return {
      ...state,
      priorityPlayerId: playerId,
      activePlayerId: playerId,
      phase: "ACTION"
    };
  }

  function putOnBoard(
    state: GameState,
    playerId: PlayerId,
    definitions: CardDefinition[]
  ): GameState {
    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          board: definitions.map((definition, index) =>
            createUnitInstance(
              createCardInstance(definition, playerId, `${playerId}-board-${definition.id}-${index}`)
            )
          )
        }
      }
    };
  }
  const dummySpell: CardDefinition = {
    id: "dummy-spell", name: "Dummy Spell", type: "spell", cost: 1,
    effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
  };
  const damageSpell: CardDefinition = {
    id: "damage-spell", name: "Damage Spell", type: "spell", cost: 1,
    effects: [{ type: "DEAL_DAMAGE", amount: 10, target: "NEXUS" }] // 10 damage for Darius level up
  };

  const kalista2: CardDefinition = {
    id: "kalista-2", name: "Kalista", type: "champion", cost: 3, attack: 5, health: 4, level: 2
  };
  const kalista1: CardDefinition = {
    id: "kalista-1", name: "Kalista", type: "champion", cost: 3, attack: 4, health: 3, level: 1,
    levelUpCondition: { type: "ALLIES_DIED", threshold: 3 }, leveledUpCardId: "kalista-2"
  };

  const lux2: CardDefinition = {
    id: "lux-2", name: "Lux", type: "champion", cost: 5, attack: 5, health: 6, level: 2
  };
  const lux1: CardDefinition = {
    id: "lux-1", name: "Lux", type: "champion", cost: 5, attack: 4, health: 5, level: 1,
    levelUpCondition: { type: "SPELLS_CAST", threshold: 4 }, leveledUpCardId: "lux-2"
  };

  const darius2: CardDefinition = {
    id: "darius-2", name: "Darius", type: "champion", cost: 6, attack: 10, health: 6, level: 2
  };
  const darius1: CardDefinition = {
    id: "darius-1", name: "Darius", type: "champion", cost: 6, attack: 6, health: 5, level: 1,
    levelUpCondition: { type: "NEXUS_DAMAGE_DEALT", threshold: 10 }, leveledUpCardId: "darius-2"
  };

  it("Kalista levels up when 3 allied units die", async () => {
    const { sampleUnitCards } = await import("./sampleCards");
    if (!sampleUnitCards.find(c => c.id === "kalista-2")) sampleUnitCards.push(kalista2);

    let state = createInitialGameState([...sampleUnitCards, ...sampleUnitCards], [...sampleUnitCards, ...sampleUnitCards], 123);
    state = applyAction(state, { type: "START_GAME", firstPlayerId: "P1" });
    state.players.P1.mana = 10;
    state.players.P1.hand.push({ instanceId: "kalista", definition: kalista1, ownerId: "P1" });
    
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "kalista" });
    
    const kalistaInstance = state.players.P1.board[0];
    expect(kalistaInstance.definition.level).toBe(1);
    
    const { updateChampionProgress, checkChampionLevelUps } = await import("./engine");
    
    updateChampionProgress(state, { type: "UNIT_DIED", playerId: "P1", unitInstanceId: "some-id" });
    updateChampionProgress(state, { type: "UNIT_DIED", playerId: "P1", unitInstanceId: "some-id2" });
    checkChampionLevelUps(state);
    
    expect(state.players.P1.board[0].definition.level).toBe(1);
    
    updateChampionProgress(state, { type: "UNIT_DIED", playerId: "P1", unitInstanceId: "some-id3" });
    checkChampionLevelUps(state);
    
    expect(state.players.P1.board[0].definition.level).toBe(2);
    expect(state.players.P1.board[0].maxHealth).toBe(4); 
    expect(state.players.P1.board[0].definition.attack).toBe(5); 
  });

  it("Lux levels up when 4 spells are cast", async () => {
    const { sampleUnitCards } = await import("./sampleCards");
    if (!sampleUnitCards.find(c => c.id === "lux-2")) sampleUnitCards.push(lux2);

    let state = createInitialGameState([...sampleUnitCards, ...sampleUnitCards], [...sampleUnitCards, ...sampleUnitCards], 123);
    state = applyAction(state, { type: "START_GAME", firstPlayerId: "P1" });
    state.players.P1.mana = 10;
    
    state.players.P1.hand.push({ instanceId: "lux", definition: lux1, ownerId: "P1" });
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "lux" });
    
    const { updateChampionProgress, checkChampionLevelUps } = await import("./engine");
    
    for (let i = 0; i < 3; i++) {
      updateChampionProgress(state, { type: "SPELL_CAST", playerId: "P1", cardInstanceId: "s" + i });
    }
    checkChampionLevelUps(state);
    expect(state.players.P1.board[0].definition.level).toBe(1);
    
    updateChampionProgress(state, { type: "SPELL_CAST", playerId: "P1", cardInstanceId: "s4" });
    checkChampionLevelUps(state);
    expect(state.players.P1.board[0].definition.level).toBe(2);
  });

  it("Darius levels up when 10+ nexus damage is dealt to opponent", async () => {
    const { sampleUnitCards } = await import("./sampleCards");
    if (!sampleUnitCards.find(c => c.id === "darius-2")) sampleUnitCards.push(darius2);

    let state = createInitialGameState([...sampleUnitCards, ...sampleUnitCards], [...sampleUnitCards, ...sampleUnitCards], 123);
    state = applyAction(state, { type: "START_GAME", firstPlayerId: "P1" });
    state.players.P1.mana = 10;
    
    state.players.P1.hand.push({ instanceId: "darius", definition: darius1, ownerId: "P1" });
    state.players.P1.hand.push({ instanceId: "dmg", definition: damageSpell, ownerId: "P1" });
    
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "darius" });
    expect(state.players.P1.board[0].definition.level).toBe(1);
    
    // P2 passes priority back to P1
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    
    state = applyAction(state, { type: "PLAY_SPELL", playerId: "P1", cardInstanceId: "dmg", target: { type: "NEXUS", playerId: "P2" } });
    
    expect(state.players.P1.board[0].definition.level).toBe(2);
    expect(state.visualEvents.some(v => v.type === "CHAMPION_LEVELED_UP")).toBe(true);
  });
  
  it("Damage persists across level up", async () => {
    const { sampleUnitCards } = await import("./sampleCards");
    if (!sampleUnitCards.find(c => c.id === "darius-2")) sampleUnitCards.push(darius2);

    let state = createInitialGameState([...sampleUnitCards, ...sampleUnitCards], [...sampleUnitCards, ...sampleUnitCards], 123);
    state = applyAction(state, { type: "START_GAME", firstPlayerId: "P1" });
    state.players.P1.mana = 10;
    state.players.P1.hand.push({ instanceId: "darius", definition: darius1, ownerId: "P1" });
    
    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "darius" });
    
    state.players.P1.board[0].damage = 2;
    expect(state.players.P1.board[0].maxHealth).toBe(5); 
    
    const { updateChampionProgress, checkChampionLevelUps } = await import("./engine");
    updateChampionProgress(state, { type: "NEXUS_DAMAGED", playerId: "P2", amount: 10 });
    checkChampionLevelUps(state);
    
    expect(state.players.P1.board[0].definition.level).toBe(2);
    expect(state.players.P1.board[0].maxHealth).toBe(6);
    expect(state.players.P1.board[0].damage).toBe(2);
  });

  it("champion behaves as a unit on board", () => {
    let state = started({ "kalista-2": kalista2 });
    state.players.P1.mana = 10;
    state.players.P1.hand.push(createCardInstance(kalista1, "P1", "kalista"));

    state = applyAction(state, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: "kalista"
    });

    expect(state.players.P1.board[0]).toMatchObject({
      instanceId: "kalista",
      ownerId: "P1",
      attack: 4,
      maxHealth: 3
    });
  });

  it("champion levels up from allied deaths through events", () => {
    const deathChamp1: CardDefinition = {
      id: "death-champ-1",
      name: "Death Champ",
      type: "champion",
      championId: "death-champ",
      cost: 1,
      attack: 1,
      health: 3,
      level: 1,
      levelUpCondition: { type: "ALLIES_DIED", threshold: 1 },
      level2CardCode: "death-champ-2"
    };
    const deathChamp2: CardDefinition = {
      id: "death-champ-2",
      name: "Death Champ",
      type: "CHAMPION",
      championId: "death-champ",
      cost: 1,
      attack: 3,
      health: 4,
      level: 2
    };
    const killAlly: CardDefinition = {
      id: "kill-ally",
      name: "Kill Ally",
      type: "spell",
      cost: 0,
      effects: [{ type: "DEAL_DAMAGE", amount: 1, target: "ALLY_UNIT" }]
    };
    let state = started({ "death-champ-2": deathChamp2 });
    state = putOnBoard(state, "P1", [deathChamp1, dummyUnit]);
    state.players.P1.hand = [createCardInstance(killAlly, "P1", "kill")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "kill",
      target: { type: "UNIT", playerId: "P1", unitId: "P1-board-dummy-unit-1" }
    });

    expect(state.players.P1.board[0].definition.level).toBe(2);
    expect(state.players.P1.board[0].definition.type).toBe("CHAMPION");
  });

  it("champion levels up from spell casts through events", () => {
    const champ1: CardDefinition = {
      id: "spell-champ-1",
      name: "Spell Champ",
      type: "champion",
      championId: "spell-champ",
      cost: 1,
      attack: 1,
      health: 3,
      level: 1,
      levelUpCondition: { type: "SPELLS_CAST", threshold: 1 },
      level2CardCode: "spell-champ-2"
    };
    const champ2: CardDefinition = {
      id: "spell-champ-2",
      name: "Spell Champ",
      type: "champion",
      championId: "spell-champ",
      cost: 1,
      attack: 4,
      health: 5,
      level: 2
    };
    let state = started({ "spell-champ-2": champ2 });
    state = putOnBoard(state, "P1", [champ1]);
    state.players.P1.hand = [createCardInstance(dummySpell, "P1", "spell")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.players.P1.board[0].definition.level).toBe(2);
  });

  it("champion levels up from nexus damage through events", () => {
    const champ1: CardDefinition = {
      id: "nexus-champ-1",
      name: "Nexus Champ",
      type: "champion",
      championId: "nexus-champ",
      cost: 1,
      attack: 1,
      health: 3,
      level: 1,
      levelUpCondition: { type: "NEXUS_DAMAGE_DEALT", threshold: 2 },
      level2CardCode: "nexus-champ-2"
    };
    const champ2: CardDefinition = {
      id: "nexus-champ-2",
      name: "Nexus Champ",
      type: "champion",
      championId: "nexus-champ",
      cost: 1,
      attack: 4,
      health: 5,
      level: 2
    };
    let state = started({ "nexus-champ-2": champ2 });
    state = putOnBoard(state, "P1", [champ1]);
    state.players.P1.hand = [createCardInstance(damageSpell, "P1", "damage")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "damage",
      target: { type: "NEXUS", playerId: "P2" }
    });

    expect(state.players.P1.board[0].definition.level).toBe(2);
  });

  it("champion levels up when this champion has struck enough times", () => {
    const champ1: CardDefinition = {
      id: "strike-champ-1",
      name: "Strike Champ",
      type: "champion",
      championId: "strike-champ",
      cost: 1,
      attack: 2,
      health: 3,
      level: 1,
      levelUpCondition: { type: "THIS_CHAMPION_STRUCK", threshold: 1 },
      level2CardCode: "strike-champ-2"
    };
    const champ2: CardDefinition = {
      id: "strike-champ-2",
      name: "Strike Champ",
      type: "champion",
      championId: "strike-champ",
      cost: 1,
      attack: 5,
      health: 5,
      level: 2
    };
    let state = started({ "strike-champ-2": champ2 });
    state = putOnBoard(state, "P1", [champ1]);
    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "P1-board-strike-champ-1-0"
    });
    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P1.board[0].definition.level).toBe(2);
  });

  it("CHAMPION_LEVELED_UP visual event is emitted", () => {
    const champ1: CardDefinition = {
      id: "event-champ-1",
      name: "Event Champ",
      type: "champion",
      championId: "event-champ",
      cost: 1,
      attack: 1,
      health: 3,
      level: 1,
      levelUpCondition: { type: "SPELLS_CAST", threshold: 1 },
      level2CardCode: "event-champ-2"
    };
    const champ2: CardDefinition = {
      id: "event-champ-2",
      name: "Event Champ",
      type: "champion",
      championId: "event-champ",
      cost: 1,
      attack: 3,
      health: 4,
      level: 2
    };
    let state = started({ "event-champ-2": champ2 });
    state = putOnBoard(state, "P1", [champ1]);
    state.players.P1.hand = [createCardInstance(dummySpell, "P1", "spell")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.visualEvents).toContainEqual({
      type: "CHAMPION_LEVELED_UP",
      playerId: "P1",
      unitId: "P1-board-event-champ-1-0",
      newLevel: 2
    });
  });

  it("level 2 triggers replace level 1 behavior after level up", () => {
    const triggerSpell: CardDefinition = {
      id: "trigger-spell",
      name: "Trigger Spell",
      type: "spell",
      cost: 0,
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const champ1: CardDefinition = {
      id: "trigger-champ-1",
      name: "Trigger Champ",
      type: "champion",
      championId: "trigger-champ",
      cost: 1,
      attack: 1,
      health: 3,
      level: 1,
      levelUpCondition: { type: "SPELLS_CAST", threshold: 1 },
      level2CardCode: "trigger-champ-2",
      triggers: [
        {
          id: "level-1-spell-buff",
          sourceId: "",
          event: "SPELL_CAST",
          effects: [
            { type: "BUFF_UNIT", attack: 1, health: 0, target: "SOURCE", duration: "PERMANENT" }
          ]
        }
      ]
    };
    const champ2: CardDefinition = {
      id: "trigger-champ-2",
      name: "Trigger Champ",
      type: "champion",
      championId: "trigger-champ",
      cost: 1,
      attack: 2,
      health: 4,
      level: 2,
      triggers: [
        {
          id: "level-2-spell-buff",
          sourceId: "",
          event: "SPELL_CAST",
          effects: [
            { type: "BUFF_UNIT", attack: 3, health: 0, target: "SOURCE", duration: "PERMANENT" }
          ]
        }
      ]
    };

    let state = started({ "trigger-champ-2": champ2 });
    state = putOnBoard(state, "P1", [champ1]);
    state.players.P1.hand = [createCardInstance(triggerSpell, "P1", "spell-1")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell-1",
      target: { type: "SELF", playerId: "P1" }
    });
    expect(state.players.P1.board[0].definition.level).toBe(2);
    expect(getUnitAttack(state.players.P1.board[0])).toBe(3);

    state = withPriority(state, "P1");
    state.players.P1.hand = [createCardInstance(triggerSpell, "P1", "spell-2")];
    state.players.P1.mana = 10;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell-2",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(getUnitAttack(state.players.P1.board[0])).toBe(6);
    expect(
      state.players.P1.board[0].modifiers.some(
        (modifier) => modifier.sourceName === "level-2-spell-buff"
      )
    ).toBe(true);
  });
});
