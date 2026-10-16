"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, ShieldAlert, X } from "lucide-react";
import styles from "./NoticeCard.module.css";

export type NoticeTone = "warning" | "danger";

export interface NoticeCardProps {
  tone?: NoticeTone;
  /** sm: compact toast; lg: spacious confirmation dialog. */
  size?: "sm" | "lg";
  /** Short protocol label shown in the header, e.g. "SYSTEM WARNING · TIMEOUT ALERT". */
  badge: string;
  title: string;
  /** Message body. */
  children: ReactNode;
  /** id for the title element (use with aria-labelledby on a dialog). */
  titleId?: string;
  /** Icon inside the framed square and in the badge. Defaults by tone. */
  icon?: ReactNode;
  /** Seconds shown in the header timer pill. */
  timerSeconds?: number;
  /** Duration in ms of the shrinking progress bar. Omit for no bar. */
  progressDuration?: number;
  /** Shows a close (X) button when provided. */
  onClose?: () => void;
  closeLabel?: string;
  /** Buttons rendered below the message in a two-column row. */
  actions?: ReactNode;
}

/**
 * Cyber notice frame shared by the AFK toast and confirmation dialogs.
 */
export function NoticeCard({
  tone = "warning",
  size = "sm",
  badge,
  title,
  children,
  titleId,
  icon,
  timerSeconds,
  progressDuration,
  onClose,
  closeLabel = "Close notification",
  actions,
}: NoticeCardProps) {
  const defaultIcon = tone === "danger" ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />;
  const badgeIcon = tone === "danger" ? <ShieldAlert size={14} /> : <AlertTriangle size={14} />;

  return (
    <div className={`${styles.card} ${styles[tone]} ${size === "lg" ? styles.lg : ""}`}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shards} aria-hidden="true">
        <span className={`${styles.shard} ${styles.shard1}`} />
        <span className={`${styles.shard} ${styles.shard2}`} />
        <span className={`${styles.shard} ${styles.shard3}`} />
      </div>

      <div className={styles.header}>
        <div className={styles.badge}>
          {badgeIcon}
          <span>{badge}</span>
        </div>

        {timerSeconds !== undefined ? (
          <div className={styles.timer}>
            <Clock size={12} />
            <span>{timerSeconds}s</span>
          </div>
        ) : null}

        {onClose ? (
          <button type="button" className={styles.close} onClick={onClose} aria-label={closeLabel}>
            <X size={15} />
          </button>
        ) : null}
      </div>

      <div className={styles.body}>
        <div className={styles.iconFrame} aria-hidden="true">
          {icon ?? defaultIcon}
        </div>
        <div className={styles.text}>
          <h4 className={styles.title} id={titleId}>
            {title}
          </h4>
          <p className={styles.message}>{children}</p>
        </div>
      </div>

      {actions ? <div className={styles.actions}>{actions}</div> : null}

      {progressDuration !== undefined ? (
        <div className={styles.track} aria-hidden="true">
          <motion.div
            className={styles.bar}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: progressDuration / 1000, ease: "linear" }}
          />
        </div>
      ) : null}
    </div>
  );
}

export default NoticeCard;
