import { describe, expect, it } from "vitest";
import type { CombatAttacker, UnitInstance } from "@backend/game/types";
import { splitBoardRows } from "./boardRows";

const unit = (id: string, boardRow: "ACTIVE" | "WAITING" = "WAITING") => ({ instanceId: id, boardRow }) as UnitInstance;

describe("splitBoardRows", () => {
  const board = [unit("a"), unit("b"), unit("c", "ACTIVE")];

  it("outside combat the active row is the units marked active", () => {
    const rows = splitBoardRows(board, [], "P1", "P1");
    expect(rows.active.map((u) => u?.instanceId)).toEqual(["c"]);
    expect(rows.waiting.map((u) => u.instanceId)).toEqual(["a", "b"]);
  });

  it("in combat the attacker's active row is its attackers, lane by lane", () => {
    const lanes = [{ attackerId: "b" }, { attackerId: "zz" }] as CombatAttacker[];
    const rows = splitBoardRows(board, lanes, "P1", "P1");
    expect(rows.active.map((u) => u?.instanceId)).toEqual(["b", undefined]);
    // The unit marked active but not in a lane goes back to waiting.
    expect(rows.waiting.map((u) => u.instanceId)).toEqual(["a", "c"]);
  });

  it("in combat the defender's active row is its blockers, with empty lanes kept", () => {
    const lanes = [{ attackerId: "x", blockerId: "a" }, { attackerId: "y" }] as CombatAttacker[];
    const rows = splitBoardRows(board, lanes, "P2", "P1");
    expect(rows.active.map((u) => u?.instanceId)).toEqual(["a", undefined]);
    expect(rows.waiting.map((u) => u.instanceId)).toEqual(["b", "c"]);
  });
});
