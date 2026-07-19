import clsx from "clsx";
import type { GameState } from "@backend/game/types";

function Chip({
  label,
  value,
  highlight = false,
  urgent = false
}: {
  label: string;
  value: string;
  highlight?: boolean;
  urgent?: boolean;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-3 py-1 backdrop-blur-sm">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <strong
        className={clsx(
          "font-mono text-xs font-bold tabular-nums",
          urgent ? "text-destructive" : highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </strong>
    </span>
  );
}

export interface CenterInfoProps {
  state: GameState;
  timeRemainingMs: number;
}

/** Production battle-line status HUD rendered between the two active rows. */
export function CenterInfo({ state, timeRemainingMs }: CenterInfoProps) {
  const remainingSeconds = Math.ceil(timeRemainingMs / 1000);
  const isTimeCritical = state.started && remainingSeconds <= 5;
  const attackToken = `${state.attackTokenPlayerId}${state.attackTokenAvailable ? "" : " spent"}`;

  return (
    <div className="relative z-[1] flex flex-col items-center gap-2 py-2" aria-label="Battle line status">
      <div className="flex items-center gap-3">
        <span className="h-px w-16 bg-gradient-to-r from-transparent to-primary/50 sm:w-24" />
        <h2 className="font-serif text-sm font-semibold uppercase tracking-[0.35em] text-primary/90">
          Battle Line
        </h2>
        <span className="h-px w-16 bg-gradient-to-l from-transparent to-primary/50 sm:w-24" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Chip label="Round" value={String(state.round)} />
        <Chip label="Turn" value={String(state.turn)} />
        <Chip label="Priority" value={state.priorityPlayerId} />
        <Chip label="Phase" value={state.phase} highlight />
        {state.started ? (
          <Chip label="Time" value={`${remainingSeconds}s`} highlight urgent={isTimeCritical} />
        ) : null}
        <Chip label="Attack" value={attackToken} />
      </div>
    </div>
  );
}
