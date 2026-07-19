import { Heart, Sword, Zap } from "lucide-react";
import clsx from "clsx";

export type StatKind = "mana" | "attack" | "hp";

const CONFIG: Record<
  StatKind,
  { Icon: typeof Zap; ring: string; text: string; glow: string }
> = {
  mana: {
    Icon: Zap,
    ring: 'border-mana/70 bg-mana/20',
    text: 'text-mana',
    glow: 'shadow-[0_0_10px_var(--mana)]',
  },
  attack: {
    Icon: Sword,
    ring: 'border-attack/70 bg-attack/20',
    text: 'text-attack',
    glow: 'shadow-[0_0_10px_var(--attack)]',
  },
  hp: {
    Icon: Heart,
    ring: 'border-hp/70 bg-hp/20',
    text: 'text-hp',
    glow: 'shadow-[0_0_10px_var(--hp)]',
  }
};

export function StatPip({
  kind,
  value,
  size = "md",
  className
}: {
  kind: StatKind;
  value: number | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { Icon, ring, text, glow } = CONFIG[kind];
  const dims =
    size === "sm"
      ? "h-6 w-6 text-[11px]"
      : size === "lg"
        ? "h-11 w-11 text-lg"
        : "h-8 w-8 text-sm";
  const iconSize = size === "sm" ? 9 : size === "lg" ? 15 : 12;

  return (
    <span
      className={clsx(
        "relative flex items-center justify-center rounded-full border font-mono font-bold tabular-nums backdrop-blur-sm",
        ring,
        text,
        glow,
        dims,
        className
      )}
    >
      <Icon
        size={iconSize}
        className="absolute -top-1 -left-1 rounded-full bg-background/80 p-[1px]"
        strokeWidth={2.5}
      />
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{value}</span>
    </span>
  );
}
