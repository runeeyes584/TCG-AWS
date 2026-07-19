import Image from "next/image";
import React from "react";

export interface CardBackProps {
  onClick?: () => void;
  variant?: "default" | "hand";
  className?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const CardBack: React.FC<CardBackProps> = ({
  onClick,
  variant = "default",
  className,
  onMouseEnter,
  onMouseLeave
}) => {
  return (
    <div
      className={`
        relative aspect-[5/7] w-28 overflow-hidden rounded-xl
        border-2 border-slate-600 shadow-lg select-none
        ${variant === "hand" ? "cursor-pointer" : ""}
        ${className ?? ""}
      `}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-hidden="true"
    >
      <Image
        src="/monster/card-back.png"
        alt=""
        fill
        sizes="112px"
        className="object-cover"
      />
    </div>
  );
};
