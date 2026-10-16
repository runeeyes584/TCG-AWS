import type { ReactNode } from "react";
import styles from "./PageShell.module.css";

export interface PageShellProps {
  children: ReactNode;
  /** Decorative artwork rendered on the right side (e.g. <PhaserSplash />). */
  art?: ReactNode;
  /** Center the content on both axes. */
  centered?: boolean;
  /**
   * State/page hook classes that other (global) stylesheets key off,
   * e.g. "is-searching". Not for restyling the shell itself.
   */
  className?: string;
}

/**
 * Full-viewport page frame with the shared dark-fantasy backdrop:
 * tactical grid, optional artwork and an edge vignette.
 */
export function PageShell({ children, art, centered = false, className }: PageShellProps) {
  const shellClass = [styles.shell, centered ? styles.centered : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={shellClass}>
      <div className={styles.grid} aria-hidden="true" />
      {art ? (
        <div className={styles.art} aria-hidden="true">
          {art}
        </div>
      ) : null}
      <div className={styles.shade} aria-hidden="true" />
      {children}
    </main>
  );
}

export default PageShell;
