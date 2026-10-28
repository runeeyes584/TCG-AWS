import type { SessionReplacedReason } from "@backend/shared/multiplayer";

/**
 * Tells the app that this tab may no longer play, and why: `tab` when the game is now used from another tab of this
 * browser, `device` when a sign-in on another device or browser ended this session. Every source (the tab channel,
 * the API, the WebSocket) reports here; `SessionGuard` shows it.
 */

export type { SessionReplacedReason };

type Listener = (reason: SessionReplacedReason) => void;

let replaced: SessionReplacedReason | undefined;
const listeners = new Set<Listener>();

/** Reports that this tab was replaced. `device` outranks `tab`: a session that has ended cannot be taken back here. */
export function reportSessionReplaced(reason: SessionReplacedReason): void {
  if (replaced === "device" || replaced === reason) return;
  replaced = reason;
  listeners.forEach((listener) => listener(reason));
}

export function sessionReplacement(): SessionReplacedReason | undefined {
  return replaced;
}

/** Calls the listener for every replacement from now on, and at once if this tab was already replaced. */
export function onSessionReplaced(listener: Listener): () => void {
  listeners.add(listener);
  if (replaced) listener(replaced);
  return () => listeners.delete(listener);
}

/** For tests: forgets the replacement and the listeners. */
export function resetSessionReplacement(): void {
  replaced = undefined;
  listeners.clear();
}
