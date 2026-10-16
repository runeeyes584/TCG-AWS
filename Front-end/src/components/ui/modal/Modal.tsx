"use client";

import {
  useEffect,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CornerBrackets } from "../decor";
import styles from "./Modal.module.css";

export type ModalTone = "cyan" | "rose";

export interface ModalProps {
  children: ReactNode;
  /** Called on Escape / overlay click. Omit for a modal that cannot be dismissed. */
  onClose?: () => void;
  /** Set false to temporarily block dismissal (e.g. while submitting). */
  dismissible?: boolean;
  /** id of the element that titles the dialog. */
  labelledBy?: string;
  tone?: ModalTone;
  shape?: "sharp" | "rounded";
  align?: "start" | "center";
  /** Max panel width in px. */
  maxWidth?: number;
  zIndex?: number;
  /** Render holographic corner brackets on the panel. */
  corners?: boolean;
  /** Render children directly (no panel chrome) so they bring their own frame, e.g. <NoticeCard>. */
  bare?: boolean;
}

const CORNER_COLOR: Record<ModalTone, string> = {
  cyan: "#38bdf8",
  rose: "#fb7185",
};

/**
 * Shared dialog shell: portal, overlay, a11y attributes, Escape / outside-click dismissal.
 * Panel content is supplied by the caller.
 */
export function Modal({
  children,
  onClose,
  dismissible = true,
  labelledBy,
  tone = "cyan",
  shape = "sharp",
  align = "start",
  maxWidth = 450,
  zIndex = 1200,
  corners = false,
  bare = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const canDismiss = Boolean(onClose) && dismissible;

  useEffect(() => {
    if (!canDismiss) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canDismiss, onClose]);

  if (!mounted) return null;

  const panelClass = [
    styles.panel,
    styles[tone],
    shape === "rounded" ? styles.rounded : "",
    align === "center" ? styles.center : "",
  ]
    .filter(Boolean)
    .join(" ");

  const style = {
    "--ui-modal-z": zIndex,
    "--ui-modal-width": `${maxWidth}px`,
  } as CSSProperties;

  return createPortal(
    <div
      className={styles.overlay}
      // A dialog is a control of its own: a click inside it is not a click on the table beneath it.
      data-ui-shield=""
      style={style}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      onClick={canDismiss ? onClose : undefined}
    >
      {bare ? (
        <div className={styles.bare} onClick={(event: MouseEvent) => event.stopPropagation()}>
          {children}
        </div>
      ) : (
        <section className={panelClass} onClick={(event: MouseEvent) => event.stopPropagation()}>
          {corners ? <CornerBrackets size={14} color={CORNER_COLOR[tone]} /> : null}
          {children}
        </section>
      )}
    </div>,
    document.body
  );
}

export default Modal;
