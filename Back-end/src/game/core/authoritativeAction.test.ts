import { describe, expect, it } from "vitest";
import { createCardInstance, createUnitInstance } from "../entities/cards";
import type { CardDefinition, PlayerId } from "../types";
import { applyAction, createInitialGameState } from "./engine";
import { applyAuthoritativeAction } from "./authoritativeAction";

const fighter: CardDefinition = {
  id: "authoritative-combat-fighter",
  name: "Authoritative Combat Fighter",
  cost: 1,
  type: "unit",
  attack: 3,
  health: 3
};

function deck(playerId: PlayerId) {
  return Array.from({ length: 10 }, (_, index) =>
    createCardInstance(fighter, playerId, `${playerId}-card-${index}`)
  );
}

describe("authoritative game actions", () => {
  it("commits blocks and resolves combat in one server transition", () => {
    let state = applyAction(createInitialGameState(deck("P1"), deck("P2"), 1), {
      type: "START_GAME",
      firstPlayerId: "P1"
    });
    state.players.P1.board = [
      createUnitInstance(createCardInstance(fighter, "P1", "attacker"))
    ];
    state = applyAction(state, {
      type: "DECLARE_ATTACKER",
      playerId: "P1",
      unitInstanceId: "attacker"
    });
    state = applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });

    const resolved = applyAuthoritativeAction(state, {
      type: "COMMIT_BLOCKS",
      playerId: "P2"
    });

    expect(resolved.phase).toBe("ACTION");
    expect(resolved.players.P2.nexusHp).toBe(17);
    expect(resolved.combat.attackers).toEqual([]);
    expect(resolved.priorityPlayerId).toBe("P2");
  });
});
