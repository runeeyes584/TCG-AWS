"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import styles from "./StatCard.module.css";

export type StatTone = "neutral" | "win" | "loss" | "accent";

export interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Leading icon next to the label (profile variant). */
  icon?: ReactNode;
  /** Small caption under the value (profile variant). */
  sub?: ReactNode;
  /** Catalogue code in the top-right corner (profile variant). */
  code?: string;
  /** Color of the value. */
  tone?: StatTone;
  /** profile: dossier tile; compact: label-over-value summary tile. */
  variant?: "profile" | "compact";
  /** Lift the tile on hover. */
  lift?: boolean;
}

/** Single statistic tile. */
export function StatCard({
  label,
  value,
  icon,
  sub,
  code,
  tone = "neutral",
  variant = "profile",
  lift = false,
}: StatCardProps) {
  const isProfile = variant === "profile";
  const toneClass = tone === "neutral" ? "" : styles[tone];

  return (
    <motion.div
      className={`${styles.card} ${isProfile ? styles.profile : styles.compact}`}
      whileHover={lift ? { y: -4 } : undefined}
    >
      {isProfile ? (
        <div className={styles.header}>
          {icon}
          <span>{label}</span>
        </div>
      ) : (
        <small className={styles.label}>{label}</small>
      )}
      <strong className={`${styles.value} ${toneClass}`}>{value}</strong>
      {isProfile && sub ? <small className={styles.sub}>{sub}</small> : null}
      {isProfile && code ? <span className={styles.code}>{code}</span> : null}
    </motion.div>
  );
}

export default StatCard;
