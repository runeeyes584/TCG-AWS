import { describe, expect, it } from "vitest";
import type { GameState } from "@backend/game/types";
import { combatCues, cueSnapshot, type CueSnapshot } from "./combatCues";

const snap = (over: Partial<CueSnapshot> = {}): CueSnapshot => ({
  phase: "ACTION",
  attackerIds: [],
  blockerIds: [],
  championIds: [],
  ...over
});

const quiet = { champions: [], attackers: [], blockers: [] };

describe("combatCues", () => {
  it("cues nothing on the first reading", () => {
    expect(combatCues(undefined, snap({ phase: "BLOCK", attackerIds: ["a"] }))).toEqual(quiet);
  });

  it("does not shake for an ordinary unit being declared or taken back", () => {
    expect(combatCues(snap(), snap({ attackerIds: ["a"] })).champions).toEqual([]);
    expect(combatCues(snap(), snap({ attackerIds: ["a"] })).commit).toBeUndefined();
    expect(combatCues(snap({ attackerIds: ["a"] }), snap())).toEqual(quiet);
  });

  it("cues a champion when it joins a lane, once", () => {
    const declared = snap({ attackerIds: ["c"], championIds: ["c"] });
    expect(combatCues(snap(), declared).champions).toEqual(["c"]);
    expect(combatCues(declared, declared).champions).toEqual([]);
    // A champion blocking counts too.
    const blocking = snap({ phase: "BLOCK", attackerIds: ["a"], blockerIds: ["k"], championIds: ["k"] });
    expect(combatCues(snap({ phase: "BLOCK", attackerIds: ["a"] }), blocking).champions).toEqual(["k"]);
  });

  it("cues the commit of the attack, with the attackers", () => {
    const cues = combatCues(snap({ attackerIds: ["a", "b"] }), snap({ phase: "BLOCK", attackerIds: ["a", "b"] }));
    expect(cues.commit).toEqual({ kind: "attack", unitIds: ["a", "b"] });
  });

  it("cues the commit of the blocks, with the blockers, once combat leaves the block phase", () => {
    const blocking = snap({ phase: "BLOCK", attackerIds: ["a"], blockerIds: ["k"] });
    expect(combatCues(blocking, snap({ phase: "COMBAT" })).commit).toEqual({ kind: "defend", unitIds: ["k"] });
    expect(combatCues(blocking, snap({ phase: "ACTION" })).commit).toEqual({ kind: "defend", unitIds: ["k"] });
  });

  it("does not cue a pass with no blockers, nor a phase that stays where it was", () => {
    expect(combatCues(snap({ phase: "BLOCK", attackerIds: ["a"] }), snap({ phase: "ACTION" })).commit).toBeUndefined();
    expect(combatCues(snap({ phase: "BLOCK", blockerIds: ["k"] }), snap({ phase: "BLOCK", blockerIds: ["k"] })).commit).toBeUndefined();
  });
});

describe("new attackers and blockers", () => {
  it("names the units that have just been sent to attack, once", () => {
    const before = snap({ attackerIds: ["a"] });
    const after = snap({ attackerIds: ["a", "b"] });
    expect(combatCues(before, after).attackers).toEqual(["b"]);
    expect(combatCues(after, after).attackers).toEqual([]);
  });

  it("names the units that have just been put in front of an attacker", () => {
    const before = snap({ phase: "BLOCK", attackerIds: ["a", "b"], blockerIds: ["k"] });
    const after = snap({ phase: "BLOCK", attackerIds: ["a", "b"], blockerIds: ["k", "m"] });
    expect(combatCues(before, after).blockers).toEqual(["m"]);
    expect(combatCues(before, before).blockers).toEqual([]);
  });
});

describe("cueSnapshot", () => {
  it("reads attackers, blockers and champions from a state", () => {
    const state = {
      phase: "BLOCK",
      combat: {
        attackers: [
          { attackerId: "a", blockerId: "k" },
          { attackerId: "c", blockerId: undefined }
        ]
      }
    } as unknown as GameState;
    expect(cueSnapshot(state, (id) => id === "c" || id === "k")).toEqual({
      phase: "BLOCK",
      attackerIds: ["a", "c"],
      blockerIds: ["k"],
      championIds: ["c", "k"]
    });
  });
});
