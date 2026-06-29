import { describe, it, expect } from "vitest";
import { applyAction, createInitialGameState } from "./engine";
import { GameState, CardDefinition, PlayerId, GameAction, UnitInstance } from "./types";

describe("Champion System & Level Up", () => {
  const dummyUnit: CardDefinition = {
    id: "dummy-unit", name: "Dummy Unit", type: "unit", cost: 1, attack: 1, health: 1
  };
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
});
