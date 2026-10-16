import { describe, expect, it } from "vitest";
import type { GameState } from "@backend/game/types";
import { laneLinks } from "./laneLinks";

const state = (attackTokenPlayerId: "P1" | "P2", attackers: Array<{ attackerId: string; blockerId?: string }>) =>
  ({ attackTokenPlayerId, combat: { attackers } }) as unknown as GameState;

describe("laneLinks", () => {
  it("has no lanes outside a combat", () => {
    expect(laneLinks(state("P1", []), "P1", () => false)).toEqual([]);
  });

  it("makes a lane of each attacker, on the column of its place, with whose side it is on", () => {
    const lanes = laneLinks(state("P1", [{ attackerId: "a" }, { attackerId: "b", blockerId: "k" }]), "P1", () => false);
    expect(lanes).toEqual([
      { column: 0, attackerId: "a", blockerId: undefined, attackerSide: "viewer", blocked: false, champion: false },
      { column: 1, attackerId: "b", blockerId: "k", attackerSide: "viewer", blocked: true, champion: false }
    ]);
    expect(laneLinks(state("P2", [{ attackerId: "a" }]), "P1", () => false)[0].attackerSide).toBe("opponent");
  });

  it("marks a lane with a champion in it, attacking or blocking", () => {
    const lanes = laneLinks(state("P1", [{ attackerId: "c" }, { attackerId: "a", blockerId: "c2" }]), "P1", (id) => id.startsWith("c"));
    expect(lanes.map((lane) => lane.champion)).toEqual([true, true]);
  });
});
