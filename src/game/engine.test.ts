import { describe, expect, it } from "vitest";
import {
  createCardInstance,
  createUnitInstance,
  getUnitAttack,
  getUnitHealth,
  getUnitMaxHealth
} from "./cards";
import { applyAction, createInitialGameState } from "./engine";
import {
  CardDefinition,
  GameState,
  GameValidationError,
  PlayerId,
  SpellEffect
} from "./types";

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

const guardian: CardDefinition = {
  id: "guardian",
  name: "Training Guardian",
  cost: 3,
  type: "unit",
  attack: 3,
  health: 5
};

function card(definition: CardDefinition, ownerId: PlayerId, id: string) {
  return createCardInstance(definition, ownerId, id);
}

function deck(ownerId: PlayerId, count: number, prefix = ownerId) {
  return Array.from({ length: count }, (_, index) =>
    card(soldier, ownerId, `${prefix}-${index}`)
  );
}

function uniqueDeck(ownerId: PlayerId, count: number, prefix: string = ownerId) {
  return Array.from({ length: count }, (_, index) =>
    card({ ...soldier, id: `${prefix}-def-${index}`, name: `Unit ${index}` }, ownerId, `${prefix}-${index}`)
  );
}

function startedGame(): GameState {
  return applyAction(createInitialGameState(deck("P1", 10), deck("P2", 10)), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
}

function withBoard(
  state: GameState,
  playerId: PlayerId,
  units: ReturnType<typeof createUnitInstance>[]
): GameState {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        board: units
      }
    }
  };
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
        mana: 5,
        spellMana: 3
      }
    }
  };
}

function spell(id: string, effect: SpellEffect, cost = 1) {
  return {
    id,
    name: id,
    cost,
    type: "spell" as const,
    effects: [effect]
  };
}

function declareAndCommitAttack(state: GameState, attackerId: string): GameState {
  state = applyAction(state, {
    type: "DECLARE_ATTACKER",
    playerId: "P1",
    unitInstanceId: attackerId
  });
  return applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
}

describe("game engine", () => {
  it("starts the game", () => {
    const state = startedGame();

    expect(state.started).toBe(true);
    expect(state.phase).toBe("ACTION");
    expect(state.round).toBe(1);
    expect(state.turn).toBe(1);
    expect(state.priorityPlayerId).toBe("P1");
    expect(state.attackTokenPlayerId).toBe("P1");
    expect(state.attackTokenAvailable).toBe(true);
    expect(state.consecutivePasses).toBe(0);
    expect(state.combat.attackers).toEqual([]);
    expect(state.players.P1.hand).toHaveLength(4);
    expect(state.players.P2.hand).toHaveLength(4);
  });

  it("shuffles decks deterministically before the opening draw", () => {
    const sameSeedA = applyAction(
      createInitialGameState(uniqueDeck("P1", 10, "a"), uniqueDeck("P2", 10, "b"), 42),
      { type: "START_GAME", firstPlayerId: "P1" }
    );
    const sameSeedB = applyAction(
      createInitialGameState(uniqueDeck("P1", 10, "a"), uniqueDeck("P2", 10, "b"), 42),
      { type: "START_GAME", firstPlayerId: "P1" }
    );
    const differentSeed = applyAction(
      createInitialGameState(uniqueDeck("P1", 10, "a"), uniqueDeck("P2", 10, "b"), 99),
      { type: "START_GAME", firstPlayerId: "P1" }
    );

    const handIds = (state: GameState) =>
      state.players.P1.hand.map((cardInHand) => cardInHand.instanceId);

    expect(handIds(sameSeedA)).toEqual(handIds(sameSeedB));
    expect(handIds(sameSeedA)).not.toEqual(["a-0", "a-1", "a-2", "a-3"]);
    expect(handIds(sameSeedA)).not.toEqual(handIds(differentSeed));
  });

  it("draws cards", () => {
    const state = applyAction(startedGame(), {
      type: "DRAW_CARD",
      playerId: "P1",
      count: 2
    });

    expect(state.players.P1.hand).toHaveLength(6);
    expect(state.players.P1.deck).toHaveLength(4);
  });

  it("refills mana and rotates the attack token on round start", () => {
    const state = applyAction(startedGame(), { type: "START_ROUND" });

    expect(state.phase).toBe("ACTION");
    expect(state.round).toBe(2);
    expect(state.attackTokenPlayerId).toBe("P2");
    expect(state.players.P1.maxMana).toBe(2);
    expect(state.players.P1.mana).toBe(2);
    expect(state.players.P1.spellMana).toBe(1);
  });

  it("plays units from hand onto the board", () => {
    const initial = startedGame();
    const unitCardId = initial.players.P1.hand[0].instanceId;

    const state = applyAction(initial, {
      type: "PLAY_UNIT",
      playerId: "P1",
      cardInstanceId: unitCardId
    });

    expect(state.players.P1.hand).toHaveLength(3);
    expect(state.players.P1.mana).toBe(0);
    expect(state.players.P1.board).toHaveLength(1);
    expect(state.players.P1.board[0]).toMatchObject({
      instanceId: unitCardId,
      attack: 2,
      maxHealth: 2,
      damage: 0
    });
    expect(state.priorityPlayerId).toBe("P2");
    expect(state.consecutivePasses).toBe(0);
  });

  it("ends the round after both players pass consecutively", () => {
    let state = startedGame();

    state = applyAction(state, { type: "END_TURN", playerId: "P1" });
    expect(state.round).toBe(1);
    expect(state.priorityPlayerId).toBe("P2");
    expect(state.consecutivePasses).toBe(1);

    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    expect(state.round).toBe(2);
    expect(state.attackTokenPlayerId).toBe("P2");
    expect(state.attackTokenAvailable).toBe(true);
    expect(state.priorityPlayerId).toBe("P2");
    expect(state.consecutivePasses).toBe(0);
  });

  it("declares attackers into combat state and commits to block phase", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker"))
    ]);

    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker"
    });

    expect(state.combat.attackers).toEqual([{ attackerId: "attacker" }]);
    expect(state.players.P2.nexusHp).toBe(20);

    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });

    expect(state.phase).toBe("BLOCK");
    expect(state.priorityPlayerId).toBe("P2");
    expect(state.players.P2.nexusHp).toBe(20);
  });

  it("can declare multiple attackers before committing attack", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker-1")),
      createUnitInstance(card(soldier, "P1", "attacker-2"))
    ]);

    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-1"
    });
    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-2"
    });

    expect(state.combat.attackers).toEqual([
      { attackerId: "attacker-1" },
      { attackerId: "attacker-2" }
    ]);
  });

  it("can remove an attacker before committing attack", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker-1")),
      createUnitInstance(card(soldier, "P1", "attacker-2"))
    ]);

    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-1"
    });
    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-2"
    });
    state = applyAction(state, {
      type: "REMOVE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-1"
    });

    expect(state.combat.attackers).toEqual([{ attackerId: "attacker-2" }]);
    expect(state.players.P1.board[0].exhausted).toBe(false);
  });

  it("assigns a blocker to an attacker", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(soldier, "P2", "blocker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");

    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });

    expect(state.combat.attackers).toEqual([
      { attackerId: "attacker", blockerId: "blocker" }
    ]);
  });

  it("prevents assigning the same blocker twice", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker-1")),
      createUnitInstance(card(soldier, "P1", "attacker-2"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(soldier, "P2", "blocker"))
    ]);
    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-1"
    });
    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker-2"
    });
    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker-1",
      blockerId: "blocker"
    });

    expect(() =>
      applyAction(state, {
        type: "DECLARE_BLOCKER",
        playerId: "P2",
        attackerId: "attacker-2",
        blockerId: "blocker"
      })
    ).toThrow(GameValidationError);
  });

  it("prevents non-defenders from declaring blockers", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker")),
      createUnitInstance(card(soldier, "P1", "fake-blocker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");

    expect(() =>
      applyAction(state, {
        type: "DECLARE_BLOCKER",
        playerId: "P1",
        attackerId: "attacker",
        blockerId: "fake-blocker"
      })
    ).toThrow(GameValidationError);
  });

  it("does not resolve combat before blocks are committed", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");

    expect(() => applyAction(state, { type: "RESOLVE_COMBAT" })).toThrow(
      GameValidationError
    );
    expect(state.players.P2.nexusHp).toBe(20);
  });

  it("unblocked attacker damages nexus after combat resolution", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });

    expect(state.phase).toBe("COMBAT");
    expect(state.players.P2.nexusHp).toBe(20);

    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P2.nexusHp).toBe(17);
    expect(state.phase).toBe("ACTION");
    expect(state.combat.attackers).toEqual([]);
    expect(state.attackTokenAvailable).toBe(false);
    expect(state.priorityPlayerId).toBe("P2");
  });

  it("blocked attacker and blocker strike each other", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(guardian, "P1", "attacker"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(guardian, "P2", "blocker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(getUnitHealth(state.players.P1.board[0])).toBe(2);
    expect(getUnitHealth(state.players.P2.board[0])).toBe(2);
  });

  it("blocked attacker does not damage nexus", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(soldier, "P2", "blocker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P2.nexusHp).toBe(20);
    expect(state.players.P2.board).toHaveLength(0);
    expect(state.players.P2.graveyard[0].instanceId).toBe("blocker");
  });

  it("ends the game when a nexus reaches zero", () => {
    let state = withBoard(startedGame(), "P1", [
      {
        ...createUnitInstance(card(bruiser, "P1", "finisher")),
        attack: 20
      }
    ]);
    state = declareAndCommitAttack(state, "finisher");
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
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

  it("TOUGH reduces incoming combat damage by 1", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance({
        ...card(guardian, "P2", "blocker"),
        definition: { ...guardian, keywords: ["TOUGH"] }
      })
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(getUnitHealth(state.players.P2.board[0])).toBe(3);
  });

  it("BARRIER prevents the next damage instance and is removed", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance({
        ...card(soldier, "P2", "blocker"),
        definition: { ...soldier, keywords: ["BARRIER"] }
      })
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(getUnitHealth(state.players.P2.board[0])).toBe(2);
    expect(state.players.P2.board[0].keywords).not.toContain("BARRIER");
  });

  it("QUICK_ATTACK attacker strikes first and avoids dead blocker strikeback", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance({
        ...card(bruiser, "P1", "attacker"),
        definition: { ...bruiser, keywords: ["QUICK_ATTACK"] }
      })
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(soldier, "P2", "blocker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(getUnitHealth(state.players.P1.board[0])).toBe(3);
    expect(state.players.P2.board).toHaveLength(0);
  });

  it("OVERWHELM deals excess blocked damage to the defender nexus", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance({
        ...card(guardian, "P1", "attacker"),
        definition: { ...guardian, attack: 5, keywords: ["OVERWHELM"] }
      })
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(soldier, "P2", "blocker"))
    ]);
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, {
      type: "DECLARE_BLOCKER",
      playerId: "P2",
      attackerId: "attacker",
      blockerId: "blocker"
    });
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P2.nexusHp).toBe(17);
  });

  it("DEAL_DAMAGE spell damages an enemy unit", () => {
    const damageSpell = spell("damage", {
      type: "DEAL_DAMAGE",
      amount: 2,
      target: "ENEMY_UNIT"
    });
    let state = withBoard(startedGame(), "P2", [
      createUnitInstance(card(guardian, "P2", "target"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });

    expect(getUnitHealth(state.players.P2.board[0])).toBe(3);
    expect(state.players.P1.graveyard[0].instanceId).toBe("spell");
  });

  it("spends spell mana before regular mana when playing spells", () => {
    const damageSpell = spell(
      "damage",
      {
        type: "DEAL_DAMAGE",
        amount: 1,
        target: "ENEMY_UNIT"
      },
      2
    );
    let state = withBoard(startedGame(), "P2", [
      createUnitInstance(card(guardian, "P2", "target"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });

    expect(state.players.P1.spellMana).toBe(1);
    expect(state.players.P1.mana).toBe(5);
  });

  it("HEAL spell heals an ally unit up to max health", () => {
    const healSpell = spell("heal", {
      type: "HEAL",
      amount: 3,
      target: "ALLY_UNIT"
    });
    const damaged = createUnitInstance(card(guardian, "P1", "ally"));
    damaged.damage = 3;
    let state = withBoard(startedGame(), "P1", [damaged]);
    state = withHand(state, "P1", [card(healSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });

    expect(getUnitHealth(state.players.P1.board[0])).toBe(5);
  });

  it("DRAW_CARD spell draws cards for self", () => {
    const drawSpell = spell("draw", {
      type: "DRAW_CARD",
      count: 2,
      target: "SELF"
    });
    let state = startedGame();
    state = withHand(state, "P1", [card(drawSpell, "P1", "spell")]);
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.players.P1.hand).toHaveLength(2);
    expect(state.players.P1.deck).toHaveLength(deckBefore - 2);
  });

  it("BUFF_UNIT spell adds a temporary modifier instead of mutating base stats", () => {
    const buffSpell = spell("buff", {
      type: "BUFF_UNIT",
      attack: 1,
      health: 1,
      target: "ALLY_UNIT"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(buffSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });

    const unit = state.players.P1.board[0];
    expect(unit.attack).toBe(2);
    expect(unit.maxHealth).toBe(2);
    expect(unit.damage).toBe(0);
    expect(getUnitHealth(unit)).toBe(3);
    expect(getUnitAttack(unit)).toBe(3);
    expect(getUnitMaxHealth(unit)).toBe(3);
    expect(unit.modifiers[0]).toMatchObject({
      sourceName: "buff",
      type: "BUFF",
      attackDelta: 1,
      healthDelta: 1,
      duration: "THIS_ROUND",
      createdRound: 1,
      createdTurn: 1
    });
  });

  it("THIS_ROUND modifiers expire when the attack token changes round", () => {
    const buffSpell = spell("buff", {
      type: "BUFF_UNIT",
      attack: 1,
      health: 1,
      target: "ALLY_UNIT"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(buffSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = applyAction(state, { type: "END_TURN", playerId: "P1" });

    const unit = state.players.P1.board[0];
    expect(state.round).toBe(2);
    expect(unit.modifiers).toEqual([]);
    expect(getUnitAttack(unit)).toBe(2);
    expect(getUnitMaxHealth(unit)).toBe(2);
    expect(getUnitHealth(unit)).toBe(2);
  });

  it("PERMANENT modifiers persist through round cleanup", () => {
    const buffSpell = spell("permanent-buff", {
      type: "BUFF_UNIT",
      attack: 1,
      health: 1,
      target: "ALLY_UNIT",
      duration: "PERMANENT"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(buffSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = applyAction(state, { type: "END_TURN", playerId: "P1" });

    const unit = state.players.P1.board[0];
    expect(state.round).toBe(2);
    expect(unit.modifiers).toHaveLength(1);
    expect(getUnitAttack(unit)).toBe(3);
    expect(getUnitHealth(unit)).toBe(3);
  });

  it("THIS_TURN modifiers expire at end turn", () => {
    const buffSpell = spell("turn-buff", {
      type: "BUFF_UNIT",
      attack: 1,
      health: 1,
      target: "ALLY_UNIT",
      duration: "THIS_TURN"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(buffSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });

    const unit = state.players.P1.board[0];
    expect(unit.modifiers).toEqual([]);
    expect(getUnitAttack(unit)).toBe(2);
    expect(getUnitHealth(unit)).toBe(2);
  });

  it("UNTIL_COMBAT_END modifiers expire after combat resolution", () => {
    const buffSpell = spell("combat-buff", {
      type: "BUFF_UNIT",
      attack: 1,
      health: 1,
      target: "ALLY_UNIT",
      duration: "UNTIL_COMBAT_END"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "attacker"))
    ]);
    state = withHand(state, "P1", [card(buffSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "attacker" }
    });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    const unit = state.players.P1.board[0];
    expect(state.players.P2.nexusHp).toBe(17);
    expect(unit.modifiers).toEqual([]);
    expect(getUnitAttack(unit)).toBe(2);
    expect(getUnitHealth(unit)).toBe(2);
  });

  it("damage stays separate from health buffs", () => {
    const damageSpell = spell("damage", {
      type: "DEAL_DAMAGE",
      amount: 2,
      target: "ENEMY_UNIT"
    });
    const buffSpell = spell("health-buff", {
      type: "BUFF_UNIT",
      attack: 0,
      health: 3,
      target: "ALLY_UNIT",
      duration: "THIS_ROUND"
    });
    let state = withBoard(startedGame(), "P2", [
      createUnitInstance(card(guardian, "P2", "target"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "damage-spell")]);
    state = withHand(state, "P2", [card(buffSpell, "P2", "buff-spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "damage-spell",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });
    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P2",
      cardInstanceId: "buff-spell",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });

    const unit = state.players.P2.board[0];
    expect(unit.damage).toBe(2);
    expect(getUnitMaxHealth(unit)).toBe(8);
    expect(getUnitHealth(unit)).toBe(6);
  });

  it("unit dies when a health modifier expires", () => {
    const buffSpell = spell("turn-health", {
      type: "BUFF_UNIT",
      attack: 0,
      health: 2,
      target: "ALLY_UNIT",
      duration: "THIS_TURN"
    });
    const damageSpell = spell("damage", {
      type: "DEAL_DAMAGE",
      amount: 3,
      target: "ENEMY_UNIT"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(buffSpell, "P1", "buff-spell")]);
    state = withHand(state, "P2", [card(damageSpell, "P2", "damage-spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "buff-spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });
    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P2",
      cardInstanceId: "damage-spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });

    expect(getUnitHealth(state.players.P1.board[0])).toBe(1);

    state = applyAction(state, { type: "END_TURN", playerId: "P1" });

    expect(state.players.P1.board).toHaveLength(0);
    expect(state.players.P1.graveyard.some((dead) => dead.instanceId === "ally")).toBe(
      true
    );
  });

  it("dead units move from board to graveyard after spell damage", () => {
    const damageSpell = spell("lethal", {
      type: "DEAL_DAMAGE",
      amount: 2,
      target: "ENEMY_UNIT"
    });
    let state = withBoard(startedGame(), "P2", [
      createUnitInstance(card(soldier, "P2", "target"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });

    expect(state.players.P2.board).toHaveLength(0);
    expect(state.players.P2.graveyard.some((dead) => dead.instanceId === "target")).toBe(
      true
    );
  });

  it("GRANT_KEYWORD spell resolves synchronously through the effect queue", () => {
    const keywordSpell = spell("grant-tough", {
      type: "GRANT_KEYWORD",
      keyword: "TOUGH",
      target: "ALLY_UNIT"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(keywordSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });

    expect(state.effectQueue).toEqual([]);
    expect(state.players.P1.board[0].keywords).toContain("TOUGH");
  });

  it("SUMMON_UNIT spell resolves synchronously through the effect queue", () => {
    const summonSpell = spell("summon", {
      type: "SUMMON_UNIT",
      cardDefinition: soldier,
      target: "SELF"
    });
    let state = withHand(startedGame(), "P1", [card(summonSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.effectQueue).toEqual([]);
    expect(state.players.P1.board).toHaveLength(1);
    expect(state.players.P1.board[0].definition.id).toBe("soldier");
  });

  it("validates spell target ownership", () => {
    const damageSpell = spell("bad-target", {
      type: "DEAL_DAMAGE",
      amount: 1,
      target: "ENEMY_UNIT"
    });
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(soldier, "P1", "ally"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "spell")]);

    expect(() =>
      applyAction(state, {
        type: "PLAY_SPELL",
        playerId: "P1",
        cardInstanceId: "spell",
        target: { type: "UNIT", playerId: "P1", unitId: "ally" }
      })
    ).toThrow(GameValidationError);
  });
});
