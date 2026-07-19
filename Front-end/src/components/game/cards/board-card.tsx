"use client";

import clsx from "clsx";
import { motion } from "framer-motion";
import type { UnitInstance, VisualEvent } from "@backend/game/types";
import { GameCard } from "./game-card";

export interface BoardCardProps {
  unit: UnitInstance;
  selected?: boolean;
  onClick?: () => void;
  visualEvents?: VisualEvent[];
  damagePreview?: string;
}

/** Animated board card presentation with the production game contract. */
export function BoardCard({
  unit,
  selected = false,
  onClick,
  visualEvents,
  damagePreview
}: BoardCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      whileHover={{ y: -6, scale: 1.04, zIndex: 30 }}
      className={clsx(
        "active-unit-card relative aspect-[5/7] h-full w-full min-h-0 min-w-0 shrink-0 touch-manipulation",
        "cursor-pointer",
        selected &&
          "z-30 rounded-tl-2xl rounded-br-2xl ring-2 ring-cyan-400"
      )}
    >
      <GameCard
        unit={unit}
        compact
        selected={selected}
        onClick={onClick}
        visualEvents={visualEvents}
      />
      {damagePreview ? (
        <div className="damage-preview">{damagePreview}</div>
      ) : null}
    </motion.div>
  );
}
