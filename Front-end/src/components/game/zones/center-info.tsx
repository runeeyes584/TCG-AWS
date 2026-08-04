import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { GameState, PlayerId } from "@backend/game/types";
import { GiSheikahEye } from "react-icons/gi";
import { RiEyeCloseLine } from "react-icons/ri";

function CenterBeastEye({ phase }: { phase?: string }) {
  const [isOpen, setIsOpen] = useState(true);
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsOpen(false);
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);
      return () => clearTimeout(timer);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
      const distance = Math.min(4.5, Math.hypot(e.clientX - centerX, e.clientY - centerY) / 65);
      setPupilOffset({
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const isDanger = phase === "COMBAT" || phase === "BLOCK";

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center pointer-events-none mx-1.5"
      aria-hidden="true"
    >
      <div
        className={clsx(
          "relative flex items-center justify-center p-1.5 rounded-full border transition-all duration-500 backdrop-blur-md",
          isOpen
            ? isDanger
              ? "border-red-500/70 bg-red-950/60 shadow-[0_0_22px_rgba(239,68,68,0.85)] scale-105"
              : "border-purple-500/70 bg-purple-950/60 shadow-[0_0_22px_rgba(147,51,234,0.85)] scale-105"
            : "border-slate-800/40 bg-slate-950/40 shadow-none scale-90"
        )}
      >
        <span
          className={clsx(
            "absolute inset-0 rounded-full animate-ping opacity-30",
            isDanger ? "bg-red-600" : "bg-purple-600"
          )}
        />

        {isOpen ? (
          <div
            style={{
              transform: `translate(${pupilOffset.x}px, ${pupilOffset.y}px)`,
              transition: "transform 0.08s ease-out"
            }}
          >
            <GiSheikahEye
              className={clsx(
                "w-6 h-6 transition-colors duration-300",
                isDanger
                  ? "text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.95)]"
                  : "text-purple-300 drop-shadow-[0_0_10px_rgba(192,132,252,0.95)]"
              )}
            />
          </div>
        ) : (
          <RiEyeCloseLine className="w-5 h-5 text-slate-500/60 transition-opacity duration-300" />
        )}
      </div>
    </div>
  );
}

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
    <span
      className={clsx(
        "battle-info-chip flex items-center gap-1.5 rounded-full border border-border/70 bg-card/50 px-3 py-1 backdrop-blur-sm",
        highlight && "battle-info-chip--highlight",
        urgent && "battle-info-chip--urgent"
      )}
    >
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <strong
        className={clsx(
          "battle-info-chip__value font-mono text-xs font-bold tabular-nums",
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
  playerNames?: Partial<Record<PlayerId, string>>;
}

function MysticRiftDivider() {
  return (
    <div className="mystic-rift-divider" aria-hidden="true">
      <svg viewBox="0 0 520 28" preserveAspectRatio="none">
        <defs>
          <filter id="mystic-rift-glow" x="-30%" y="-150%" width="160%" height="400%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="mystic-rift-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#111827" stopOpacity="0" />
            <stop offset="0.25" stopColor="#8b5cf6" />
            <stop offset="0.5" stopColor="#f59e0b" />
            <stop offset="0.75" stopColor="#ef4444" />
            <stop offset="1" stopColor="#111827" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path className="mystic-rift-divider__glow" d="M0 14 C72 5 105 22 164 13 S260 7 312 15 S418 23 520 11" />
        <path className="mystic-rift-divider__line" d="M0 14 C72 5 105 22 164 13 S260 7 312 15 S418 23 520 11" />
      </svg>
      <span className="mystic-rift-divider__ember mystic-rift-divider__ember--one" />
      <span className="mystic-rift-divider__ember mystic-rift-divider__ember--two" />
      <span className="mystic-rift-divider__ember mystic-rift-divider__ember--three" />
    </div>
  );
}

/** Production battle-line status HUD rendered between the two active rows. */
export function CenterInfo({ state, timeRemainingMs, playerNames = {} }: CenterInfoProps) {
  const remainingSeconds = Math.ceil(timeRemainingMs / 1000);
  const isTimeCritical = state.started && remainingSeconds <= 5;

  const playerName = (playerId: PlayerId) =>
    playerNames[playerId]?.trim() || `Player ${playerId === "P1" ? "One" : "Two"}`;
  const attackToken = `${playerName(state.attackTokenPlayerId)}${state.attackTokenAvailable ? "" : " spent"}`;

  return (
    <div
      className="battle-line-info battle-line-info--mystic relative z-[1] flex flex-col items-center gap-2 py-2"
      data-phase={state.phase}
      aria-label="Battle line status"
    >
      <MysticRiftDivider />
      <div className="battle-line-info__brand flex items-center gap-2">
        <CenterBeastEye phase={state.phase} />
        <h2>Battle Line</h2>
        <span className="battle-line-info__brand-line" aria-hidden="true" />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <Chip label="Round" value={String(state.round)} />
        <Chip label="Turn" value={String(state.turn)} />
        <Chip label="Priority" value={playerName(state.priorityPlayerId)} />
        <Chip label="Phase" value={state.phase} highlight />
        {state.started ? (
          <Chip label="Time" value={`${remainingSeconds}s`} highlight urgent={isTimeCritical} />
        ) : null}
        <Chip label="Attack" value={attackToken} />
      </div>
    </div>
  );
}
