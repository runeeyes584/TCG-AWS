import type { ToastInput } from "../ui/feedback";

/** The toasts of checking for, and leaving, an active match. One key: a newer one replaces the one on the screen. */
export const PENDING_MATCH_NOTICE_KEY = "pending-match";

const base = { key: PENDING_MATCH_NOTICE_KEY, tone: "danger" } as const;

export const pendingMatchCheckFailed = (message: string): ToastInput => ({
  ...base,
  badge: "SYSTEM · MATCH CHECK",
  title: "MATCH CHECK FAILED",
  message,
});

export const pendingMatchLeaveFailed = (message: string): ToastInput => ({
  ...base,
  badge: "MATCH COMMAND · LEAVE",
  title: "UNABLE TO LEAVE MATCH",
  message,
});

export const waitingRoomLeaveFailed = (message: string): ToastInput => ({
  ...base,
  badge: "PRIVATE ROOM · LEAVE",
  title: "UNABLE TO LEAVE ROOM",
  message,
});

export const sessionExpiredNotice = (): ToastInput => ({
  ...base,
  tone: "warning",
  badge: "ACCOUNT · SESSION",
  title: "SESSION EXPIRED",
  message: "Your session has expired. Please sign in again.",
});

export const serverStartingNotice = (): ToastInput => ({
  ...base,
  tone: "info",
  badge: "SYSTEM · SERVICE STATUS",
  title: "SERVER STARTING",
  message: "The server is starting up. Please try again in a few seconds.",
});
