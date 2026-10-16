import { describe, expect, it } from "vitest";
import type { GameState } from "@backend/game/types";
import { TURN_CRITICAL_SECONDS, TURN_WARN_SECONDS, deriveTurnRail, urgencyFor } from "./turnRail";

describe("urgencyFor", () => {
  it("is calm until the last ten seconds, warns from ten, is critical from five", () => {
    expect(urgencyFor(TURN_WARN_SECONDS + 1, true)).toBe("calm");
    expect(urgencyFor(TURN_WARN_SECONDS, true)).toBe("warn");
    expect(urgencyFor(TURN_CRITICAL_SECONDS + 1, true)).toBe("warn");
    expect(urgencyFor(TURN_CRITICAL_SECONDS, true)).toBe("critical");
    expect(urgencyFor(0, true)).toBe("critical");
  });

  it("is calm before the match starts", () => {
    expect(urgencyFor(1, false)).toBe("calm");
  });
});

describe("deriveTurnRail", () => {
  const state = {
    round: 2,
    turn: 3,
    phase: "ACTION",
    priorityPlayerId: "P2",
    started: true,
    turnDuration: 30_000
  } as unknown as GameState;
  const callsigns = { P1: "Ada", P2: "Bram" };

  it("names whose turn it is from the viewer's side", () => {
    expect(deriveTurnRail({ state, viewerId: "P1", callsigns, remainingMs: 12_000 })).toMatchObject({
      owner: "opponent",
      callsign: "Bram",
      round: 2,
      turn: 3,
      seconds: 12,
      urgency: "calm"
    });
    expect(deriveTurnRail({ state, viewerId: "P2", callsigns, remainingMs: 12_000 }).owner).toBe("you");
  });

  it("rounds the seconds up, clamps the share left and never goes negative", () => {
    const rail = deriveTurnRail({ state, viewerId: "P1", callsigns, remainingMs: 4_100 });
    expect(rail.seconds).toBe(5);
    expect(rail.urgency).toBe("critical");
    expect(rail.fraction).toBeCloseTo(4_100 / 30_000);
    expect(deriveTurnRail({ state, viewerId: "P1", callsigns, remainingMs: -50 }).seconds).toBe(0);
    expect(deriveTurnRail({ state, viewerId: "P1", callsigns, remainingMs: 99_000 }).fraction).toBe(1);
  });
});
