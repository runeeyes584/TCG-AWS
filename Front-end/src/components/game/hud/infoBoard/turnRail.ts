import type { GamePhase, GameState, PlayerId } from "@backend/game/types";

/** How close the running turn is to timing out. */
export type TurnUrgency = "calm" | "warn" | "critical";

/** Seconds left at which the clock starts to warn / to alarm. */
export const TURN_WARN_SECONDS = 10;
export const TURN_CRITICAL_SECONDS = 5;

export interface TurnRailModel {
  round: number;
  turn: number;
  phase: GamePhase;
  /** Whose turn it is, from the viewer's side of the table. */
  owner: "you" | "opponent";
  callsign: string;
  started: boolean;
  /** Whole seconds left, rounded up like the countdown the players read. */
  seconds: number;
  /** Share of the turn still left, 0..1. */
  fraction: number;
  urgency: TurnUrgency;
}

export function urgencyFor(seconds: number, started: boolean): TurnUrgency {
  if (!started) return "calm";
  if (seconds <= TURN_CRITICAL_SECONDS) return "critical";
  if (seconds <= TURN_WARN_SECONDS) return "warn";
  return "calm";
}

export function deriveTurnRail({
  state,
  viewerId,
  callsigns,
  remainingMs
}: {
  state: GameState;
  viewerId: PlayerId;
  callsigns: Record<PlayerId, string>;
  remainingMs: number;
}): TurnRailModel {
  const ms = Math.max(0, remainingMs);
  const seconds = Math.ceil(ms / 1000);
  return {
    round: state.round,
    turn: state.turn,
    phase: state.phase,
    owner: state.priorityPlayerId === viewerId ? "you" : "opponent",
    callsign: callsigns[state.priorityPlayerId],
    started: state.started,
    seconds,
    fraction: state.turnDuration > 0 ? Math.min(1, ms / state.turnDuration) : 0,
    urgency: urgencyFor(seconds, state.started)
  };
}
