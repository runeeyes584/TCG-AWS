import { describe, expect, it } from "vitest";
import { isUnitOnTable } from "./hoverGuard";

const state = (p1: string[], p2: string[]) =>
  ({
    players: {
      P1: { board: p1.map((instanceId) => ({ instanceId })) },
      P2: { board: p2.map((instanceId) => ({ instanceId })) }
    }
  }) as never;

describe("isUnitOnTable", () => {
  it("finds a unit of either side", () => {
    expect(isUnitOnTable(state(["a"], ["b"]), { instanceId: "a" })).toBe(true);
    expect(isUnitOnTable(state(["a"], ["b"]), { instanceId: "b" })).toBe(true);
  });

  it("does not find a unit that has left the table, or that was never there", () => {
    expect(isUnitOnTable(state([], []), { instanceId: "a" })).toBe(false);
    expect(isUnitOnTable(state(["x"], ["y"]), { instanceId: "a" })).toBe(false);
  });
});
