import type { GameState, GraveyardEntry, PlayerId, VisualEvent } from "@backend/game/types";

/**
 * What happened to the graveyards between two states. The engine reports only the cards that leave a graveyard
 * (`BANISH`, `GRAVEYARD_RESTORE`) and not the ones that enter it, so the change is found by comparing the two
 * states and the events say how each card that left did so.
 */

const PLAYERS: readonly PlayerId[] = ["P1", "P2"];

export type GraveyardSnapshot = Readonly<Record<PlayerId, readonly GraveyardEntry[]>>;

export type GraveyardChange =
  | { kind: "ENTER"; playerId: PlayerId; entry: GraveyardEntry }
  | { kind: "REVIVE" | "REBIRTH" | "BANISH"; playerId: PlayerId; entry: GraveyardEntry };

export type GraveyardChangeKind = GraveyardChange["kind"];

export type ScheduledChange = GraveyardChange & { delayMs: number };

/** The most cards that fall into one graveyard that are shown one by one; the rest only make the pile react. */
export const MAX_ENTER_EFFECTS = 4;
/** A card that leaves the graveyard is shown before the ones that fall in (they would hide it). */
export const ENTER_AFTER_LEAVE_MS = 220;
export const LEAVE_STAGGER_MS = 140;
export const ENTER_STAGGER_MS = 90;

/** The graveyards as they are now. Copied, so that a state changed in place cannot alter what was remembered. */
export function graveyardSnapshot(state: Pick<GameState, "players">): GraveyardSnapshot {
  return { P1: state.players.P1.graveyard.slice(), P2: state.players.P2.graveyard.slice() };
}

/** How a card left the graveyard, from the events of the action that took it. */
function leavingKind(events: readonly VisualEvent[], playerId: PlayerId, entry: GraveyardEntry): GraveyardChangeKind | undefined {
  for (const event of events) {
    if (event.type === "BANISH" && event.playerId === playerId && event.cardInstanceId === entry.instanceId) return "BANISH";
    if (event.type === "GRAVEYARD_RESTORE" && event.playerId === playerId && event.cardInstanceId === entry.instanceId) return event.mode;
  }
  return undefined;
}

/**
 * The changes from `prev` to `next`, those that leave a graveyard first. With no earlier state (the first one seen:
 * joining a match, reconnecting) there is nothing to compare, and a card that left with no event to say how (the
 * graveyards were cleared for a new game) is not a change worth showing.
 */
export function graveyardChanges(
  prev: GraveyardSnapshot | undefined,
  next: GraveyardSnapshot,
  events: readonly VisualEvent[]
): GraveyardChange[] {
  if (!prev) return [];
  const leaving: GraveyardChange[] = [];
  const entering: GraveyardChange[] = [];

  for (const playerId of PLAYERS) {
    const before = new Set(prev[playerId].map((entry) => entry.id));
    const after = new Set(next[playerId].map((entry) => entry.id));

    for (const entry of prev[playerId]) {
      if (after.has(entry.id)) continue;
      const kind = leavingKind(events, playerId, entry);
      if (kind) leaving.push({ kind, playerId, entry } as GraveyardChange);
    }
    for (const entry of next[playerId]) {
      if (!before.has(entry.id)) entering.push({ kind: "ENTER", playerId, entry });
    }
  }
  return [...leaving, ...entering];
}

/**
 * When each change plays: those that leave a graveyard one after another from the start, those that enter after
 * them (and the pile that was just emptied), a few at a time. Entering cards beyond the limit are left out.
 */
export function scheduleChanges(changes: readonly GraveyardChange[]): ScheduledChange[] {
  const leaving = changes.filter((change) => change.kind !== "ENTER");
  const entering = changes.filter((change) => change.kind === "ENTER");
  const shown: Record<PlayerId, number> = { P1: 0, P2: 0 };
  const enterStart = leaving.length > 0 ? ENTER_AFTER_LEAVE_MS : 0;

  const scheduled: ScheduledChange[] = leaving.map((change, index) => ({ ...change, delayMs: index * LEAVE_STAGGER_MS }));
  for (const change of entering) {
    const order = shown[change.playerId];
    if (order >= MAX_ENTER_EFFECTS) continue;
    shown[change.playerId] = order + 1;
    scheduled.push({ ...change, delayMs: enterStart + order * ENTER_STAGGER_MS });
  }
  return scheduled;
}
