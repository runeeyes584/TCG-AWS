import type { NoticeTone } from "./NoticeCard";

/**
 * Where a toast stands. `game` is the match table (above the hand, at the right); `page` is every other screen
 * (top centre). Each placement is its own stack.
 */
export type ToastPlacement = "page" | "game";

export interface ToastInput {
  /** Toasts with the same key are one toast: showing it again replaces it where it stands. */
  key?: string;
  tone?: NoticeTone;
  /** Short protocol label of the header, e.g. "SYSTEM WARNING · TIMEOUT ALERT". */
  badge: string;
  title: string;
  message: string;
  /** How long it stays, in ms. */
  duration?: number;
  placement?: ToastPlacement;
}

export interface ToastItem {
  key: string;
  /** Rises each time the toast is shown, so a toast shown again restarts its countdown. */
  revision: number;
  tone: NoticeTone;
  badge: string;
  title: string;
  message: string;
  duration: number;
  placement: ToastPlacement;
}

export const MAX_TOASTS_PER_PLACEMENT = 3;
export const DEFAULT_TOAST_DURATION = 6000;

export function createToastItem(input: ToastInput, revision: number): ToastItem {
  return {
    key: input.key ?? `toast-${revision}`,
    revision,
    tone: input.tone ?? "warning",
    badge: input.badge,
    title: input.title,
    message: input.message,
    duration: input.duration ?? DEFAULT_TOAST_DURATION,
    placement: input.placement ?? "page",
  };
}

/**
 * Adds `item`. A toast with the same key is replaced in place (it keeps its position, so showing the same warning
 * again never stacks a copy of it). Otherwise it goes last, and the oldest toasts of its placement beyond the limit are
 * dropped.
 */
export function enqueueToast(list: readonly ToastItem[], item: ToastItem): ToastItem[] {
  const index = list.findIndex((toast) => toast.key === item.key);
  if (index >= 0) {
    // The placement can change with the replacement; it then goes last in the stack it moves to.
    if (list[index].placement === item.placement) return list.map((toast, i) => (i === index ? item : toast));
    return enqueueToast(removeToast(list, item.key), item);
  }

  const next = [...list, item];
  const overflow = next.filter((toast) => toast.placement === item.placement).length - MAX_TOASTS_PER_PLACEMENT;
  if (overflow <= 0) return next;

  const dropped = new Set(
    next.filter((toast) => toast.placement === item.placement).slice(0, overflow).map((toast) => toast.key)
  );
  return next.filter((toast) => !dropped.has(toast.key));
}

export function removeToast(list: readonly ToastItem[], key: string): ToastItem[] {
  return list.filter((toast) => toast.key !== key);
}
