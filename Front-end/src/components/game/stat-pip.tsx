import { GiBroadsword, GiHeartShield, GiLightningStorm } from "react-icons/gi";
import clsx from "clsx";

export type StatKind = "mana" | "attack" | "hp" | "spell";

const CONFIG: Record<
  StatKind,
  { Icon: any; iconColor: string; textColor: string; glow: string }
> = {
  mana: {
    Icon: GiLightningStorm,
    iconColor: "text-mana/52", // Soft sky blue
    textColor: "text-mana font-extrabold", // Bright sky blue text
    glow: "filter drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]",
  },
  spell: {
    Icon: GiLightningStorm,
    iconColor: "text-purple-400/60", // Soft purple
    textColor: "text-purple-300 font-extrabold", // Bright purple text
    glow: "filter drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]", // Purple glow
  },
  attack: {
    Icon: GiBroadsword,
    iconColor: "text-attack/52", // Soft pastel red
    textColor: "text-attack font-extrabold", // Bright red text
    glow: "filter drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]",
  },
  hp: {
    Icon: GiHeartShield,
    iconColor: "text-hp/52", // Soft mint green
    textColor: "text-hp font-extrabold", // Bright green text
    glow: "filter drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]",
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
  const { Icon, iconColor, textColor, glow } = CONFIG[kind];
  
  // Custom sizing for the container to maintain perfect square bounds
  const dims =
    size === "sm"
      ? "h-[33px] w-[33px] text-[22px]"
      : size === "lg"
        ? "h-14 w-14 text-[28px]"
        : "h-10 w-10 text-[20px]";

  return (
    <span
      className={clsx(
        "relative flex items-center justify-center font-mono font-extrabold tabular-nums select-none",
        dims,
        glow,
        className
      )}
    >
      {/* Icon serving as the badge background */}
      <Icon
        className={clsx(
          "absolute inset-0 w-full h-full filter drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]",
          iconColor
        )}
      />
      
      {/* Centered value overlay */}
      <span
        className={clsx(
          "z-10 drop-shadow-[0_2px_3px_rgba(0,0,0,1.0)] text-shadow-glow font-black",
          textColor
        )}
        style={{
          // Center adjustment for ATK diagonal sword
          transform: kind === "attack" ? "translate(-0.5px, -1px)" : "none"
        }}
      >
        {value}
      </span>
    </span>
  );
}
