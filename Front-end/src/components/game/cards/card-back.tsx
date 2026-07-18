import React from "react";

export interface CardBackProps {
  onClick?: () => void;
  variant?: "default" | "hand";
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const CardBack: React.FC<CardBackProps> = ({
  onClick,
  variant = "default",
  onMouseEnter,
  onMouseLeave
}) => {
  return (
    <div
      className={`
        relative aspect-[5/7] w-28 rounded-xl
        border-2 border-slate-600
        bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950
        shadow-lg
        flex items-center justify-center
        select-none
        ${variant === "hand" ? "cursor-pointer" : ""}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden="true"
    >
      {/* Viền phát sáng */}
      <div className="absolute inset-1 rounded-lg border border-slate-500" />

      {/* Logo / chữ */}
      <div className="text-center">
        <div className="text-4xl">🂠</div>
        <div className="mt-2 text-xs font-semibold tracking-widest text-slate-300 uppercase">
          Hidden
        </div>
      </div>
    </div>
  );
};
