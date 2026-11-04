import type { ReactNode } from "react";
import clsx from "clsx";
import type { TurnRailModel } from "../hud/infoBoard/turnRail";

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * Two small frames along the table's left edge: whose turn it is, and the round with the time left.
 * The turn frame breathes in the colour of who acts (emerald for you, blood-red for the opponent;
 * a solid diamond for you, a hollow one for them, so colour is never the only signal). The stack
 * is sheared by the table's lean (`--arena-edge-skew`, published by the Phaser scene) so it lies
 * along the edge; each frame's content is sheared back to stay upright. `children` hang under the
 * stack and follow the same lean (the action prompt).
 */
export function TurnRail({ model, children }: { model: TurnRailModel; children?: ReactNode }) {
  const { round, turn, phase, owner, callsign, started, seconds, fraction, urgency } = model;
  const mine = owner === "you";

  return (
    <div
      className={clsx(
        "turn-rail",
        mine ? "turn-rail--you" : "turn-rail--opponent",
        urgency !== "calm" && `turn-rail--${urgency}`
      )}
      data-phase={phase}
    >
      <section
        className="turn-rail__frame turn-rail__frame--turn"
        aria-label={`Turn ${turn}, ${mine ? "your turn" : `${callsign} to act`}`}
        aria-live="polite"
      >
        <div className="turn-rail__body">
          <span className="turn-rail__owner">
            <i className="turn-rail__sigil" aria-hidden="true" />
            {mine ? "You" : "Enemy"}
          </span>
          <span className="turn-rail__callsign" title={callsign}>
            {callsign}
          </span>
          <span className="turn-rail__meta">
            T{pad(turn)} · {phase}
          </span>
        </div>
      </section>

      <section
        className={clsx("turn-rail__frame turn-rail__frame--clock", !started && "turn-rail__frame--idle")}
        role="timer"
        aria-label={started ? `Round ${round}, ${seconds} seconds left` : `Round ${round}, waiting for the match to start`}
      >
        <div className="turn-rail__body">
          <span className="turn-rail__meta">R{pad(round)}</span>
          {/* Keyed by the second so the tick animation replays once per second. */}
          <strong className="turn-rail__clock" key={started ? seconds : "idle"}>
            {started ? seconds : "--"}
          </strong>
          <span className="turn-rail__meter" aria-hidden="true">
            <span className="turn-rail__meter-fill" style={{ width: `${(started ? fraction : 0) * 100}%` }} />
          </span>
        </div>
      </section>

      {children}
    </div>
  );
}
