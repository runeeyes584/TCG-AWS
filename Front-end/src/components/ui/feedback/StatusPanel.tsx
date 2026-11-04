import type { ReactNode } from "react";
import styles from "./StatusPanel.module.css";
import { Button } from "../button";

export interface StatusPanelProps {
  /** loading: animated dots; error: red text + optional retry; empty: plain message. */
  status?: "loading" | "error" | "empty";
  /** Dashed bordered card instead of the plain inline state. */
  boxed?: boolean;
  /** Icon shown above the message. */
  icon?: ReactNode;
  /** Spin the icon (loading placeholders). */
  spinIcon?: boolean;
  /** Message text. */
  children?: ReactNode;
  /** Accessible name for the loading dots. */
  label?: string;
  /** Retry / recover button. */
  action?: { label: string; onClick: () => void };
  /** Drop the default 220px minimum height. */
  compact?: boolean;
  /** Stretch to the full height of the parent. */
  fill?: boolean;
  /**
   * Parent-owned layout hook only (e.g. grid placement).
   * Appearance belongs to the component.
   */
  className?: string;
}

/** Loading / error / empty feedback block. */
export function StatusPanel({
  status = "empty",
  boxed = false,
  icon,
  spinIcon = false,
  children,
  label,
  action,
  compact = false,
  fill = false,
  className,
}: StatusPanelProps) {
  const rootClass = [
    styles.panel,
    status === "error" ? styles.error : "",
    boxed ? styles.boxed : "",
    compact ? styles.compact : "",
    fill ? styles.fill : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rootClass}
      role={status === "error" ? "alert" : undefined}
      aria-label={status === "loading" ? label : undefined}
    >
      {icon ? (
        <span className={`${styles.icon} ${spinIcon ? styles.spin : ""}`} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {status === "loading" && !children ? (
        <>
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </>
      ) : null}
      {children ? <p className={styles.message}>{children}</p> : null}
      {action ? (
        <Button size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export default StatusPanel;
