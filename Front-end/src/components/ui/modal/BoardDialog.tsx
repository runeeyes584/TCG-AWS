"use client";

import type { ReactNode } from "react";
import { Modal } from "./Modal";
import styles from "./BoardDialog.module.css";

export interface BoardDialogProps {
  /** Small label over the title, e.g. "SPELL READY". */
  badge: string;
  title: string;
  titleId: string;
  /** What the player is asked, under the title. */
  children?: ReactNode;
  /** Buttons, right-aligned along the bottom. Use `chamfer` buttons so the dialog and its buttons share a shape. */
  actions?: ReactNode;
  /** Called on Escape or a click outside. Omit for a dialog that can only be left through its own actions. */
  onClose?: () => void;
  /** Max width of the panel, in px. */
  maxWidth?: number;
  /** violet for a choice, blood for something that spends or cannot be taken back. */
  tone?: "violet" | "blood";
  /** The body scrolls when it is taller than the window (e.g. a grid of cards). */
  scrollBody?: boolean;
}

/**
 * The dialog of the board, in the Obsidian language: a dark slab with cut corners, a thin violet edge, a gold
 * diamond and a mono label above the title. It rides on the shared Modal (portal, overlay, Escape, a11y).
 */
export function BoardDialog({
  badge,
  title,
  titleId,
  children,
  actions,
  onClose,
  maxWidth = 440,
  tone = "violet",
  scrollBody = false
}: BoardDialogProps) {
  return (
    <Modal bare maxWidth={maxWidth} zIndex={2600} labelledBy={titleId} onClose={onClose}>
      <div className={`${styles.shell} ${styles[tone]}`}>
        <div className={styles.frame}>
          <div className={styles.face}>
            <p className={styles.badge}>
              <span className={styles.gem} aria-hidden="true" />
              {badge}
            </p>
            <h2 className={styles.title} id={titleId}>
              {title}
            </h2>
            {children ? <div className={`${styles.body} ${scrollBody ? styles.scroll : ""}`}>{children}</div> : null}
            {actions ? <div className={styles.actions}>{actions}</div> : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default BoardDialog;
