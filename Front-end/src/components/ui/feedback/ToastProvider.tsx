"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { ToastViewport } from "./ToastViewport";
import { createToastItem, enqueueToast, removeToast, type ToastInput, type ToastItem } from "./toastQueue";

export interface ToastApi {
  /** Shows a toast and returns its key. The same key shown again replaces the toast where it stands. */
  show: (input: ToastInput) => string;
  /** Takes the toast with that key away, if it is still there. */
  dismiss: (key: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Owns the toasts of the whole app. Put it once, above every screen that shows one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const revisionRef = useRef(0);

  const show = useCallback((input: ToastInput) => {
    const item = createToastItem(input, ++revisionRef.current);
    setToasts((list) => enqueueToast(list, item));
    return item.key;
  }, []);

  const dismiss = useCallback((key: string) => {
    setToasts((list) => removeToast(list, key));
  }, []);

  // The same object on every render, so a screen can list it in an effect without the effect running again.
  const api = useMemo<ToastApi>(() => ({ show, dismiss }), [show, dismiss]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) throw new Error("useToast must be used inside <ToastProvider>.");
  return api;
}
