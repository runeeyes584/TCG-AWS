"use client";

import { AnimatePresence } from "framer-motion";
import { Toast } from "./Toast";
import type { ToastItem, ToastPlacement } from "./toastQueue";
import styles from "./Toast.module.css";

const PLACEMENTS: readonly ToastPlacement[] = ["page", "game"];

export interface ToastViewportProps {
  toasts: readonly ToastItem[];
  onDismiss: (key: string) => void;
}

/** The stacks of toasts, one per placement. */
export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <>
      {PLACEMENTS.map((placement) => (
        <div key={placement} className={`${styles.viewport} ${styles[placement]}`}>
          <AnimatePresence initial={false}>
            {toasts
              .filter((toast) => toast.placement === placement)
              .map((toast) => (
                <Toast key={toast.key} toast={toast} onClose={onDismiss} />
              ))}
          </AnimatePresence>
        </div>
      ))}
    </>
  );
}
