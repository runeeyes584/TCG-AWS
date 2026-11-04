import Image from "next/image";
import clsx from "clsx";
import type React from "react";

const CORNERS = "rounded-tl-2xl rounded-br-2xl rounded-tr-none rounded-bl-none";

export interface CardBackProps {
  onClick?: () => void;
  variant?: "default" | "hand";
  className?: string;
  /** Square corners instead of the chamfered-round ones (the opponent's hand). */
  square?: boolean;
  onMouseEnter?: React.MouseEventHandler<HTMLElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLElement>;
}

/** Production card back with the v2 frame while preserving hidden-card interactions. */
export const CardBack: React.FC<CardBackProps> = ({
  onClick,
  variant = "default",
  className,
  square = false,
  onMouseEnter,
  onMouseLeave
}) => {
  const interactive = Boolean(onClick);
  const corners = square ? "rounded-none" : CORNERS;

  const activateWithKeyboard = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    onClick?.();
  };

  return (
    <div
      className={clsx(
        // `border-primary` is not a Tailwind colour here (only the --primary variable exists), so the border fell back to
        // currentColor, the pale body text. Black it explicitly.
        "relative h-full w-full overflow-hidden border border-black bg-[#140f1f] select-none",
        corners,
        variant === "default" && "aspect-[5/7] w-28",
        (interactive || variant === "hand") && "cursor-pointer",
        className
      )}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={activateWithKeyboard}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={interactive ? "Hidden card" : undefined}
    >
      <Image
        src="/monster/card-back.png"
        alt=""
        fill
        sizes="(max-width: 720px) 76px, 112px"
        className="object-cover"
      />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
      <span className="pointer-events-none absolute inset-0 animate-danger-flicker bg-primary/5 mix-blend-screen" />
      <span className={clsx("pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/40", corners)} />
    </div>
  );
};
