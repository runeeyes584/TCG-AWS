import { describe, expect, it } from "vitest";
import type { GraveyardEntry, PlayerId, VisualEvent } from "@backend/game/types";
import {
  ENTER_AFTER_LEAVE_MS,
  ENTER_STAGGER_MS,
  LEAVE_STAGGER_MS,
  MAX_ENTER_EFFECTS,
  graveyardChanges,
  graveyardSnapshot,
  scheduleChanges,
  type GraveyardSnapshot
} from "./graveyardChanges";

const entry = (instanceId: string, ownerId: PlayerId = "P1", cause: GraveyardEntry["cause"] = "COMBAT"): GraveyardEntry => ({
  id: `${instanceId}-gy`,
  instanceId,
  cardId: "card",
  ownerId,
  type: "UNIT",
  round: 1,
  cause
});

const snapshot = (p1: GraveyardEntry[] = [], p2: GraveyardEntry[] = []): GraveyardSnapshot => ({ P1: p1, P2: p2 });

describe("graveyardChanges", () => {
  it("shows nothing when there is no earlier state to compare with", () => {
    expect(graveyardChanges(undefined, snapshot([entry("a")]), [])).toEqual([]);
  });

  it("shows nothing when the graveyards did not change", () => {
    const same = snapshot([entry("a")], [entry("b", "P2")]);
    expect(graveyardChanges(same, snapshot([entry("a")], [entry("b", "P2")]), [])).toEqual([]);
  });

  it("reports a card that falls in, whatever put it there", () => {
    const changes = graveyardChanges(snapshot([entry("a")]), snapshot([entry("a"), entry("b", "P1", "DISCARD")]), []);

    expect(changes).toEqual([{ kind: "ENTER", playerId: "P1", entry: entry("b", "P1", "DISCARD") }]);
  });

  it("reports each side's graveyard on its own", () => {
    const changes = graveyardChanges(snapshot(), snapshot([entry("a")], [entry("z", "P2")]), []);

    expect(changes.map((change) => [change.kind, change.playerId])).toEqual([["ENTER", "P1"], ["ENTER", "P2"]]);
  });

  it.each([
    ["REVIVE", { type: "GRAVEYARD_RESTORE", playerId: "P1", cardInstanceId: "a", mode: "REVIVE" }],
    ["REBIRTH", { type: "GRAVEYARD_RESTORE", playerId: "P1", cardInstanceId: "a", mode: "REBIRTH" }],
    ["BANISH", { type: "BANISH", playerId: "P1", cardInstanceId: "a" }]
  ] as Array<[string, VisualEvent]>)("tells %s from the event that took the card out", (kind, event) => {
    const changes = graveyardChanges(snapshot([entry("a"), entry("c")]), snapshot([entry("c")]), [event]);

    expect(changes).toEqual([{ kind, playerId: "P1", entry: entry("a") }]);
  });

  it("knows which card was banished although it is no longer in the graveyard", () => {
    const banished = entry("gone", "P2");
    const changes = graveyardChanges(snapshot([], [banished]), snapshot(), [{ type: "BANISH", playerId: "P2", cardInstanceId: "gone" }]);

    expect(changes).toEqual([{ kind: "BANISH", playerId: "P2", entry: banished }]);
  });

  it("ignores a card that left with no event to say how (the graveyards were cleared for a new game)", () => {
    expect(graveyardChanges(snapshot([entry("a"), entry("b")]), snapshot(), [])).toEqual([]);
  });

  it("does not take an event for another player's card with the same id", () => {
    const changes = graveyardChanges(snapshot([entry("a")]), snapshot(), [{ type: "BANISH", playerId: "P2", cardInstanceId: "a" }]);

    expect(changes).toEqual([]);
  });

  it("lists the cards that leave before the cards that fall in (a spell that revives is itself spent)", () => {
    const changes = graveyardChanges(
      snapshot([entry("dead")]),
      snapshot([entry("spell", "P1", "SPELL")]),
      [{ type: "GRAVEYARD_RESTORE", playerId: "P1", cardInstanceId: "dead", mode: "REVIVE" }]
    );

    expect(changes.map((change) => change.kind)).toEqual(["REVIVE", "ENTER"]);
  });
});

describe("graveyardSnapshot", () => {
  it("is not changed by what happens to the state afterwards", () => {
    const state = { players: { P1: { graveyard: [entry("a")] }, P2: { graveyard: [] } } } as never;
    const taken = graveyardSnapshot(state);

    (state as { players: { P1: { graveyard: GraveyardEntry[] } } }).players.P1.graveyard.push(entry("b"));

    expect(taken.P1.map((item) => item.instanceId)).toEqual(["a"]);
  });
});

describe("scheduleChanges", () => {
  const enter = (id: string, playerId: PlayerId = "P1") => ({ kind: "ENTER" as const, playerId, entry: entry(id, playerId) });
  const leave = (id: string) => ({ kind: "REVIVE" as const, playerId: "P1" as const, entry: entry(id) });

  it("plays what leaves one after another and what falls in after it", () => {
    const scheduled = scheduleChanges([enter("x"), leave("a"), leave("b")]);

    expect(scheduled.map((change) => [change.kind, change.delayMs])).toEqual([
      ["REVIVE", 0],
      ["REVIVE", LEAVE_STAGGER_MS],
      ["ENTER", ENTER_AFTER_LEAVE_MS]
    ]);
  });

  it("starts the cards that fall in at once when nothing leaves", () => {
    const scheduled = scheduleChanges([enter("x"), enter("y")]);

    expect(scheduled.map((change) => change.delayMs)).toEqual([0, ENTER_STAGGER_MS]);
  });

  it("shows only a few of many cards that fall into one graveyard, and counts each side apart", () => {
    const many = Array.from({ length: 7 }, (_, index) => enter(`m${index}`));
    const scheduled = scheduleChanges([...many, enter("other", "P2")]);

    expect(scheduled.filter((change) => change.playerId === "P1")).toHaveLength(MAX_ENTER_EFFECTS);
    expect(scheduled.filter((change) => change.playerId === "P2")).toHaveLength(1);
  });
});
