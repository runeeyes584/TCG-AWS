import type { ToastInput } from "../../ui/feedback";

/**
 * A spell was aimed at something it cannot target. A hint rather than a warning, so it is cyan (the yellow and red are
 * the AFK warnings). One key: pressing a wrong target again keeps the one toast and starts its countdown over.
 */
export const WRONG_TARGET_TOAST: ToastInput = {
  key: "wrong-target",
  tone: "info",
  badge: "TARGETING · INVALID TARGET",
  title: "WRONG TARGET",
  message: "Read the description of the card and choose again.",
  duration: 3000,
  placement: "game",
};
