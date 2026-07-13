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

const nexusWatcher: CardDefinition = {
  id: "nexus-watcher",
  name: "Nexus Watcher",
  cost: 1,
  type: "unit",
  attack: 1,
  health: 3,
  abilities: [
    {
      id: "watch-nexus-damage",
      when: { event: "NEXUS_DAMAGED" },
      effects: [
        {
          type: "BUFF_UNIT",
          attack: 1,
          health: 0,
          target: "SELF",
          duration: "PERMANENT"
        }
      ]
    }
  ]
};

function eventWatcher(
  id: string,
  event: import("./events").GameEventType,
  runtimeCondition: NonNullable<CardDefinition["abilities"]>[number]["runtimeCondition"]
): CardDefinition {
  return {
    id,
    name: id,
    cost: 0,
    type: "unit",
    attack: 0,
    health: 3,
    abilities: [
      {
        id: `${id}-watch`,
        when: { event },
        runtimeCondition,
        effects: [
          {
            type: "BUFF_UNIT",
            attack: 1,
            health: 0,
            target: "SELF",
            duration: "PERMANENT"
          }
        ]
      }
    ]
  };
}

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

function forbiddenResearchSpell(): CardDefinition {
  return {
    id: "forbidden-research",
    name: "Forbidden Research",
    cost: 1,
    type: "spell",
    abilities: [
      {
        id: "forbidden-research-cast",
        targets: [
          {
            id: "discardTarget",
            kind: "ALLY_HAND_CARD"
          }
        ],
        costs: [
          {
            type: "DISCARD",
            target: "discardTarget"
          }
        ],
        effects: [
          {
            type: "DRAW_CARD",
            count: 2,
            target: "SELF"
          }
        ]
      }
    ]
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

  it("player loses immediately when drawing from an empty deck", () => {
    let state = startedGame();
    state = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          deck: []
        }
      }
    };

    state = applyAction(state, {
      type: "DRAW_CARD",
      playerId: "P1"
    });

    expect(state.players.P1.nexusHp).toBe(0);
    expect(state.winnerId).toBe("P2");
  });

  it("first player to deck out during round draw loses before the other draw resolves", () => {
    let state = startedGame();
    state = {
      ...state,
      players: {
        P1: {
          ...state.players.P1,
          deck: []
        },
        P2: {
          ...state.players.P2,
          deck: []
        }
      }
    };

    state = applyAction(state, { type: "START_ROUND" });

    expect(state.winnerId).toBe("P2");
    expect(state.players.P1.nexusHp).toBe(0);
    expect(state.players.P2.nexusHp).toBe(20);
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

  it("penalizes timeouts, shortens the next AFK turn, and resets AFK after an action", () => {
    let state = startedGame();
    const initialStartTime = state.turnStartTime;

    state = applyAction(state, { type: "TIME_OUT", playerId: "P1" });
    expect(state.players.P1.consecutiveAfkCount).toBe(1);
    expect(state.visualEvents).toContainEqual({
      type: "AFK_WARNING",
      playerId: "P1",
      afkCount: 1
    });
    expect(state.turnStartTime).toBeGreaterThanOrEqual(initialStartTime);

    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    state = applyAction(state, { type: "END_TURN", playerId: "P2" });
    expect(state.priorityPlayerId).toBe("P1");
    expect(state.turnDuration).toBe(15_000);

    state = applyAction(state, { type: "END_TURN", playerId: "P1" });
    expect(state.players.P1.consecutiveAfkCount).toBe(0);
  });

  it("awards the game to the opponent after a third consecutive timeout", () => {
    let state = startedGame();
    state.players.P1.consecutiveAfkCount = 2;

    state = applyAction(state, { type: "TIME_OUT", playerId: "P1" });

    expect(state.players.P1.consecutiveAfkCount).toBe(3);
    expect(state.winnerId).toBe("P2");
  });

  it("awards the game to the opponent when a player surrenders", () => {
    const state = applyAction(startedGame(), { type: "SURRENDER", playerId: "P1" });

    expect(state.winnerId).toBe("P2");
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

  it("unblocked combat damage goes through dealDamage and emits NEXUS_DAMAGED once", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker")),
      createUnitInstance(card(nexusWatcher, "P1", "watcher"))
    ]);

    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(state.players.P2.nexusHp).toBe(17);
    expect(state.visualEvents.filter((event) => event.type === "DAMAGE" && event.targetId === "nexus-P2")).toHaveLength(1);
    expect(state.visualEvents.filter((event) => event.type === "TRIGGER_ACTIVATED" && event.sourceId === "watcher")).toHaveLength(1);
    expect(state.players.P1.board.find((unit) => unit.instanceId === "watcher")?.modifiers).toHaveLength(1);
  });

  it("overwhelm excess damage goes through dealDamage and emits NEXUS_DAMAGED once", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card({ ...guardian, id: "overwhelm-attacker", attack: 5, keywords: ["OVERWHELM"] }, "P1", "attacker")),
      createUnitInstance(card(nexusWatcher, "P1", "watcher"))
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
    expect(state.visualEvents.filter((event) => event.type === "DAMAGE" && event.targetId === "nexus-P2")).toHaveLength(1);
    expect(state.visualEvents.filter((event) => event.type === "TRIGGER_ACTIVATED" && event.sourceId === "watcher")).toHaveLength(1);
  });

  it("spell damage to nexus goes through dealDamage and emits NEXUS_DAMAGED once", () => {
    const nexusDamage = spell("nexus-damage", {
      type: "DEAL_DAMAGE",
      amount: 2,
      target: "NEXUS"
    }, 0);
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(nexusWatcher, "P1", "watcher"))
    ]);
    state = withHand(state, "P1", [card(nexusDamage, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "NEXUS", playerId: "P2" }
    });

    expect(state.players.P2.nexusHp).toBe(18);
    expect(state.visualEvents.filter((event) => event.type === "DAMAGE" && event.targetId === "nexus-P2")).toHaveLength(1);
    expect(state.visualEvents.filter((event) => event.type === "TRIGGER_ACTIVATED" && event.sourceId === "watcher")).toHaveLength(1);
  });

  it("spell damage to nexus emits rich NEXUS_DAMAGED context", () => {
    const watcher = eventWatcher("spell-nexus-context-watcher", "NEXUS_DAMAGED", (_state, event) =>
      event.playerId === "P2" &&
      event.targetPlayerId === "P2" &&
      event.sourcePlayerId === "P1" &&
      event.sourceInstanceId === "spell" &&
      event.sourceCardId === "context-nexus-damage" &&
      event.amount === 2 &&
      event.damageType === "SPELL"
    );
    const damageSpell = spell("context-nexus-damage", {
      type: "DEAL_DAMAGE",
      amount: 2,
      target: "NEXUS"
    }, 0);
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(watcher, "P1", "watcher"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "NEXUS", playerId: "P2" }
    });

    expect(getUnitAttack(state.players.P1.board[0])).toBe(1);
  });

  it("combat damage to nexus emits rich NEXUS_DAMAGED context", () => {
    const watcher = eventWatcher("combat-nexus-context-watcher", "NEXUS_DAMAGED", (_state, event) =>
      event.playerId === "P2" &&
      event.targetPlayerId === "P2" &&
      event.sourcePlayerId === "P1" &&
      event.sourceInstanceId === "attacker" &&
      event.sourceCardId === "bruiser" &&
      event.amount === 3 &&
      event.damageType === "COMBAT"
    );
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker")),
      createUnitInstance(card(watcher, "P1", "watcher"))
    ]);

    state = declareAndCommitAttack(state, "attacker");
    state = applyAction(state, { type: "COMMIT_BLOCKS", playerId: "P2" });
    state = applyAction(state, { type: "RESOLVE_COMBAT" });

    expect(getUnitAttack(state.players.P1.board.find((unit) => unit.instanceId === "watcher")!)).toBe(1);
  });

  it("unit damage emits target unit context and keeps legacy fields", () => {
    const watcher = eventWatcher("unit-damage-context-watcher", "UNIT_DAMAGED", (_state, event) =>
      event.playerId === "P2" &&
      event.unitInstanceId === "target" &&
      event.targetPlayerId === "P2" &&
      event.targetUnitId === "target" &&
      event.targetInstanceId === "target" &&
      event.targetCardId === "guardian" &&
      event.sourcePlayerId === "P1" &&
      event.sourceInstanceId === "spell" &&
      event.sourceCardId === "context-unit-damage" &&
      event.amount === 1 &&
      event.damageType === "SPELL"
    );
    const damageSpell = spell("context-unit-damage", {
      type: "DEAL_DAMAGE",
      amount: 1,
      target: "ENEMY_UNIT"
    }, 0);
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(watcher, "P1", "watcher"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(guardian, "P2", "target"))
    ]);
    state = withHand(state, "P1", [card(damageSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "target" }
    });

    expect(getUnitAttack(state.players.P1.board[0])).toBe(1);
  });

  it("legacy SPELL_CAST listeners still work with playerId and cardInstanceId", () => {
    const watcher = eventWatcher("legacy-spell-cast-watcher", "SPELL_CAST", (_state, event) =>
      event.playerId === "P1" &&
      event.cardInstanceId === "spell" &&
      event.sourcePlayerId === "P1" &&
      event.sourceInstanceId === "spell" &&
      event.sourceCardId === "legacy-spell-cast"
    );
    const drawSpell = spell("legacy-spell-cast", {
      type: "DRAW_CARD",
      count: 1,
      target: "SELF"
    }, 0);
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(watcher, "P1", "watcher"))
    ]);
    state = withHand(state, "P1", [card(drawSpell, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(getUnitAttack(state.players.P1.board[0])).toBe(1);
  });

  it("burst spell resolves without passing priority", () => {
    const burstSpell: CardDefinition = {
      id: "burst-draw",
      name: "Burst Draw",
      cost: 0,
      type: "spell",
      spellSpeed: "burst",
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    let state = withHand(startedGame(), "P1", [card(burstSpell, "P1", "burst")]);
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "burst",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.priorityPlayerId).toBe("P1");
    expect(state.players.P1.deck).toHaveLength(deckBefore - 1);
  });

  it("slow and fast spells preserve current priority passing behavior", () => {
    const slowSpell: CardDefinition = {
      id: "slow-draw",
      name: "Slow Draw",
      cost: 0,
      type: "spell",
      spellSpeed: "slow",
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    const fastSpell: CardDefinition = {
      id: "fast-draw",
      name: "Fast Draw",
      cost: 0,
      type: "spell",
      spellSpeed: "fast",
      effects: [{ type: "DRAW_CARD", count: 1, target: "SELF" }]
    };
    let slowState = withHand(startedGame(), "P1", [card(slowSpell, "P1", "slow")]);
    slowState = applyAction(slowState, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "slow",
      target: { type: "SELF", playerId: "P1" }
    });

    let fastState = withHand(startedGame(), "P1", [card(fastSpell, "P1", "fast")]);
    fastState = applyAction(fastState, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "fast",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(slowState.priorityPlayerId).toBe("P2");
    expect(fastState.priorityPlayerId).toBe("P2");
  });

  it("playing a spell with a missing HAND_CARD target creates pendingChoice", () => {
    const research = forbiddenResearchSpell();
    let state = withHand(startedGame(), "P1", [card(research, "P1", "research")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "research",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(state.pendingChoice).toMatchObject({
      playerId: "P1",
      sourceInstanceId: "research",
      sourceCardId: "forbidden-research",
      abilityId: "forbidden-research-cast"
    });
    expect(state.players.P1.hand.map((handCard) => handCard.instanceId)).toContain("research");
    expect(state.players.P1.graveyard).toHaveLength(0);
  });

  it("collects multiple on-play targets before resolving a unit ability", () => {
    const catChampion: CardDefinition = {
      id: "cat-champion-test",
      name: "Cat Champion Test",
      cost: 5,
      type: "champion",
      attack: 2,
      health: 6,
      abilities: [
        {
          id: "cat-champion-test-play",
          onPlay: true,
          targets: [
            { id: "enemy-target-1", kind: "ENEMY_UNIT", required: true },
            { id: "enemy-target-2", kind: "ENEMY_UNIT", required: true }
          ],
          effects: [
            {
              type: "BUFF_ACTIVE_ALLIES",
              attack: 2,
              health: 2,
              duration: "THIS_ROUND"
            },
            {
              type: "DEBUFF_UNIT",
              attackDelta: -2,
              healthDelta: 0,
              target: "enemy-target-1",
              duration: "THIS_ROUND"
            },
            {
              type: "DEBUFF_UNIT",
              attackDelta: -2,
              healthDelta: 0,
              target: "enemy-target-2",
              duration: "THIS_ROUND"
            }
          ]
        }
      ]
    };
    let state = applyAction(
      createInitialGameState(deck("P1", 10), deck("P2", 10), 1, {
        [catChampion.id]: catChampion
      }),
      { type: "START_GAME", firstPlayerId: "P1" }
    );
    state = withHand(state, "P1", [card(catChampion, "P1", "cat")]);
    state = withBoard(state, "P1", [createUnitInstance(card(soldier, "P1", "ally"))]);
    state = withBoard(state, "P2", [
      createUnitInstance(card(bruiser, "P2", "enemy-1")),
      createUnitInstance(card(bruiser, "P2", "enemy-2"))
    ]);

    state = applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "cat" });

    expect(state.pendingChoice?.requiredTargets.map((target) => target.id)).toEqual([
      "enemy-target-1",
      "enemy-target-2"
    ]);

    state = applyAction(state, {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: {
        "enemy-target-1": { type: "UNIT", playerId: "P2", unitId: "enemy-1" }
      }
    });

    expect(state.pendingChoice?.requiredTargets.map((target) => target.id)).toEqual([
      "enemy-target-2"
    ]);
    expect(state.players.P1.board.some((unit) => unit.instanceId === "cat")).toBe(true);

    state = applyAction(state, {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: {
        "enemy-target-2": { type: "UNIT", playerId: "P2", unitId: "enemy-2" }
      }
    });

    expect(state.pendingChoice).toBeUndefined();
    expect(state.players.P1.hand).toHaveLength(0);
    expect(state.players.P1.board.map((unit) => unit.instanceId)).toContain("cat");
    expect(getUnitAttack(state.players.P1.board.find((unit) => unit.instanceId === "ally")!)).toBe(4);
    expect(getUnitHealth(state.players.P1.board.find((unit) => unit.instanceId === "ally")!)).toBe(4);
    expect(getUnitAttack(state.players.P1.board.find((unit) => unit.instanceId === "cat")!)).toBe(4);
    expect(getUnitHealth(state.players.P1.board.find((unit) => unit.instanceId === "cat")!)).toBe(8);
    expect(getUnitAttack(state.players.P2.board.find((unit) => unit.instanceId === "enemy-1")!)).toBe(1);
    expect(getUnitAttack(state.players.P2.board.find((unit) => unit.instanceId === "enemy-2")!)).toBe(1);
  });

  it("unrelated actions are rejected while pendingChoice exists", () => {
    const research = forbiddenResearchSpell();
    let state = withHand(startedGame(), "P1", [card(research, "P1", "research")]);
    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "research",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(() =>
      applyAction(state, { type: "DRAW_CARD", playerId: "P1" })
    ).toThrow(GameValidationError);
  });

  it("SUBMIT_ABILITY_TARGETS resolves pending spell, discards hand card, moves spell to graveyard, and clears pendingChoice", () => {
    const research = forbiddenResearchSpell();
    let state = withHand(startedGame(), "P1", [
      card(research, "P1", "research"),
      card(soldier, "P1", "discard-me")
    ]);
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "research",
      target: { type: "SELF", playerId: "P1" }
    });
    state = applyAction(state, {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: {
        discardTarget: {
          type: "HAND_CARD",
          playerId: "P1",
          cardInstanceId: "discard-me"
        }
      }
    });

    expect(state.pendingChoice).toBeUndefined();
    expect(state.players.P1.hand.map((handCard) => handCard.instanceId)).not.toContain("research");
    expect(state.players.P1.hand.map((handCard) => handCard.instanceId)).not.toContain("discard-me");
    expect(state.players.P1.graveyard).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ instanceId: "discard-me", cause: "DISCARD" }),
        expect.objectContaining({ instanceId: "research", cause: "SPELL" })
      ])
    );
    expect(state.players.P1.deck).toHaveLength(deckBefore - 2);
  });

  it("invalid pending target does not resolve or pay costs", () => {
    const research = forbiddenResearchSpell();
    let state = withHand(startedGame(), "P1", [
      card(research, "P1", "research"),
      card(soldier, "P1", "discard-me")
    ]);
    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "research",
      target: { type: "SELF", playerId: "P1" }
    });

    expect(() =>
      applyAction(state, {
        type: "SUBMIT_ABILITY_TARGETS",
        playerId: "P1",
        targets: {
          discardTarget: {
            type: "HAND_CARD",
            playerId: "P2",
            cardInstanceId: "discard-me"
          }
        }
      })
    ).toThrow(GameValidationError);

    expect(state.pendingChoice).toBeDefined();
    expect(state.players.P1.hand.map((handCard) => handCard.instanceId)).toEqual([
      "research",
      "discard-me"
    ]);
    expect(state.players.P1.graveyard).toHaveLength(0);
  });

  it("pending-choice spell emits CARD_PLAYED and SPELL_CAST only after submit", () => {
    const research = forbiddenResearchSpell();
    const cardPlayedWatcher = eventWatcher("card-played-watcher", "CARD_PLAYED", (_state, event) =>
      event.cardInstanceId === "research" && event.sourceCardId === "forbidden-research"
    );
    const spellCastWatcher = eventWatcher("spell-cast-watcher", "SPELL_CAST", (_state, event) =>
      event.cardInstanceId === "research" && event.sourceCardId === "forbidden-research"
    );
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(cardPlayedWatcher, "P1", "card-watcher")),
      createUnitInstance(card(spellCastWatcher, "P1", "spell-watcher"))
    ]);
    state = withHand(state, "P1", [
      card(research, "P1", "research"),
      card(soldier, "P1", "discard-me")
    ]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "research",
      target: { type: "SELF", playerId: "P1" }
    });
    expect(state.visualEvents.filter((event) => event.type === "TRIGGER_ACTIVATED")).toHaveLength(0);

    state = applyAction(state, {
      type: "SUBMIT_ABILITY_TARGETS",
      playerId: "P1",
      targets: {
        discardTarget: {
          type: "HAND_CARD",
          playerId: "P1",
          cardInstanceId: "discard-me"
        }
      }
    });

    expect(state.visualEvents.filter((event) => event.type === "TRIGGER_ACTIVATED" && event.sourceId === "card-watcher")).toHaveLength(1);
    expect(state.visualEvents.filter((event) => event.type === "TRIGGER_ACTIVATED" && event.sourceId === "spell-watcher")).toHaveLength(1);
  });

  it("TOUGH reduces incoming combat damage by 1", () => {
    let state = withBoard(startedGame(), "P1", [
      createUnitInstance(card(bruiser, "P1", "attacker"))
    ]);
    state = withBoard(state, "P2", [
      createUnitInstance(card({ ...guardian, id: "guardian-tough", keywords: ["TOUGH"] }, "P2", "blocker"))
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
      createUnitInstance(card({ ...soldier, id: "soldier-barrier", keywords: ["BARRIER"] }, "P2", "blocker"))
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
      createUnitInstance(card({ ...bruiser, id: "bruiser-quick", keywords: ["QUICK_ATTACK"] }, "P1", "attacker"))
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
      createUnitInstance(card({ ...guardian, id: "guardian-overwhelm", attack: 5, keywords: ["OVERWHELM"] }, "P1", "attacker"))
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

  it("resolves reusable multi-effect spells with per-effect targets", () => {
    const multiSpell: CardDefinition = {
      id: "spark-and-study",
      name: "Spark and Study",
      cost: 1,
      type: "spell",
      effects: [
        { type: "DEAL_DAMAGE", amount: 1, target: "ENEMY_UNIT" },
        { type: "DRAW_CARD", count: 1, target: "SELF" }
      ]
    };
    let state = startedGame();
    const enemy = createUnitInstance(card(soldier, "P2", "enemy"));
    state = withBoard(state, "P2", [enemy]);
    state = withHand(state, "P1", [card(multiSpell, "P1", "spell")]);
    const deckBefore = state.players.P1.deck.length;

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P2", unitId: "enemy" }
    });

    expect(getUnitHealth(state.players.P2.board[0])).toBe(1);
    expect(state.players.P1.hand).toHaveLength(1);
    expect(state.players.P1.deck).toHaveLength(deckBefore - 1);
    expect(state.players.P1.graveyard[0].instanceId).toBe("spell");
  });

  it("SELF unit spells can target an allied unit", () => {
    const selfBuff = spell("self-buff", {
      type: "BUFF_UNIT",
      attack: 1,
      health: 1,
      duration: "THIS_ROUND",
      target: "SELF"
    });
    let state = startedGame();
    const ally = createUnitInstance(card(soldier, "P1", "ally"));
    state = withBoard(state, "P1", [ally]);
    state = withHand(state, "P1", [card(selfBuff, "P1", "spell")]);

    state = applyAction(state, {
      type: "PLAY_SPELL",
      playerId: "P1",
      cardInstanceId: "spell",
      target: { type: "UNIT", playerId: "P1", unitId: "ally" }
    });

    expect(getUnitAttack(state.players.P1.board[0])).toBe(3);
    expect(getUnitMaxHealth(state.players.P1.board[0])).toBe(3);
  });

  it("can replace a unit when playing a unit onto a full board", () => {
    let state = startedGame();
    state.players.P1.mana = 10;
    
    // Fill the board (6 units)
    for (let i = 0; i < 6; i++) {
      state.players.P1.board.push(createUnitInstance(card(soldier, "P1", `u${i}`)));
    }
    
    expect(state.players.P1.board.length).toBe(6);
    const targetToReplace = state.players.P1.board[2];
    
    // Hand has new unit
    state = withHand(state, "P1", [card(bruiser, "P1", "new_unit")]);
    
    // Attempting to play without replaceUnitId should fail
    expect(() => {
      applyAction(state, { type: "PLAY_UNIT", playerId: "P1", cardInstanceId: "new_unit" });
    }).toThrowError(/must replace a unit/);
    
    // Playing WITH replaceUnitId should succeed
    state = applyAction(state, { 
      type: "PLAY_UNIT", 
      playerId: "P1", 
      cardInstanceId: "new_unit",
      replaceUnitId: targetToReplace.instanceId
    });
    
    // Board should still have 6 units
    expect(state.players.P1.board.length).toBe(6);
    // The replaced unit should be in the graveyard
    expect(state.players.P1.graveyard.some(g => g.instanceId === targetToReplace.instanceId)).toBe(true);
    // The new unit should be on the board
    expect(state.players.P1.board.some(u => u.instanceId === "new_unit")).toBe(true);
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
    expect(state.players.P1.board[0].cardId).toBe("soldier");
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

  it("does not require hand-limit discard on a normal priority pass", () => {
    let state = startedGame();
    state = {
      ...state,
      players: {
        ...state.players,
        P2: {
          ...state.players.P2,
          hand: Array.from({ length: 7 }, (_, index) =>
            card(soldier, "P2", `p2-hand-${index}`)
          )
        }
      }
    };

    state = applyAction(state, { type: "END_TURN", playerId: "P1" });

    expect(state.phase).toBe("ACTION");
    expect(state.pendingDiscard).toBeUndefined();
    expect(state.players.P2.hand).toHaveLength(7);
  });

  it("requires both players to discard to 6 only when the attack token changes", () => {
    let state = startedGame();
    state = {
      ...state,
      players: {
        ...state.players,
        P1: {
          ...state.players.P1,
          hand: Array.from({ length: 8 }, (_, index) =>
            card(soldier, "P1", `p1-hand-${index}`)
          )
        },
        P2: {
          ...state.players.P2,
          hand: Array.from({ length: 7 }, (_, index) =>
            card(soldier, "P2", `p2-hand-${index}`)
          )
        }
      }
    };

    state = applyAction(state, { type: "END_TURN", playerId: "P1" });
    expect(state.phase).toBe("ACTION");
    expect(state.pendingDiscard).toBeUndefined();

    state = applyAction(state, { type: "END_TURN", playerId: "P2" });

    expect(state.phase).toBe("DISCARD");
    expect(state.pendingDiscard).toEqual({
      playerId: "P1",
      downTo: 6,
      returnPhase: "ACTION",
      reason: "HAND_LIMIT",
      remainingPlayerIds: ["P2"]
    });
    expect(state.attackTokenPlayerId).toBe("P2");
    expect(state.visualEvents).toContainEqual({
      type: "HAND_LIMIT_DISCARD_REQUIRED",
      playerId: "P1",
      handSize: 9,
      downTo: 6
    });
    expect(() =>
      applyAction(state, { type: "END_TURN", playerId: "P1" })
    ).toThrow(GameValidationError);

    state = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "P1",
      cardInstanceId: "p1-hand-0"
    });
    state = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "P1",
      cardInstanceId: "p1-hand-1"
    });
    state = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "P1",
      cardInstanceId: "p1-hand-2"
    });

    expect(state.phase).toBe("DISCARD");
    expect(state.pendingDiscard).toMatchObject({
      playerId: "P2",
      downTo: 6,
      returnPhase: "ACTION",
      reason: "HAND_LIMIT"
    });

    state = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "P2",
      cardInstanceId: "p2-hand-0"
    });
    state = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "P2",
      cardInstanceId: "p2-hand-1"
    });

    expect(state.phase).toBe("ACTION");
    expect(state.pendingDiscard).toBeUndefined();
    expect(state.players.P1.hand).toHaveLength(6);
    expect(state.players.P2.hand).toHaveLength(6);
    expect(state.players.P2.graveyard[0]).toMatchObject({
      instanceId: "p2-hand-0",
      cause: "DISCARD",
      type: "UNIT"
    });
  });
});
