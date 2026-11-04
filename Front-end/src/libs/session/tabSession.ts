import type { SessionReplacedReason } from "@backend/shared/multiplayer";

/**
 * Keeps one tab of this browser in play. Tabs share the sign-in (the tokens are in localStorage), so opening a second
 * tab is not a new sign-in: it is a new tab claiming the game. The latest tab to load wins; the others are told
 * `tab` and offer "Use here", which reloads and so claims again. A tab that learns its session ended on another device
 * passes that on, since every tab of this browser shares that session.
 */

export type TabMessage =
  | { readonly type: "claim"; readonly tabId: string }
  | { readonly type: "device-replaced" };

/** How tabs of this browser talk to each other. */
export interface TabTransport {
  post(message: TabMessage): void;
  subscribe(handler: (message: TabMessage) => void): () => void;
}

const CHANNEL = "chrono-genesis-session";
const STORAGE_KEY = "chrono-genesis:session-signal";

const isTabMessage = (value: unknown): value is TabMessage => {
  const message = value as Partial<{ type: string; tabId: unknown }> | null;
  return message?.type === "device-replaced" || (message?.type === "claim" && typeof message.tabId === "string");
};

/** BroadcastChannel, or the `storage` event where it is missing (older Safari). */
export function createBrowserTabTransport(): TabTransport {
  if (typeof BroadcastChannel !== "undefined") {
    const channel = new BroadcastChannel(CHANNEL);
    return {
      post: (message) => channel.postMessage(message),
      subscribe: (handler) => {
        const listener = (event: MessageEvent) => { if (isTabMessage(event.data)) handler(event.data); };
        channel.addEventListener("message", listener);
        return () => {
          channel.removeEventListener("message", listener);
          channel.close();
        };
      }
    };
  }

  return {
    post: (message) => {
      try {
        // A nonce makes every signal a change, so the same claim twice still fires `storage` in the other tabs.
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...message, nonce: Math.random() }));
      } catch {
        // Storage is unavailable (private mode): this browser then cannot coordinate its tabs.
      }
    },
    subscribe: (handler) => {
      const listener = (event: StorageEvent) => {
        if (event.key !== STORAGE_KEY || !event.newValue) return;
        try {
          const { nonce: _nonce, ...message } = JSON.parse(event.newValue);
          if (isTabMessage(message)) handler(message);
        } catch {
          // Not one of ours.
        }
      };
      window.addEventListener("storage", listener);
      return () => window.removeEventListener("storage", listener);
    }
  };
}

export interface TabSession {
  /** Tells the other tabs of this browser that the session ended on another device. */
  announceDeviceReplaced(): void;
  stop(): void;
}

export function startTabSession(options: {
  transport: TabTransport;
  /** A new id for every page load: a duplicated tab copies sessionStorage, so an id kept there would be shared. */
  tabId: string;
  /**
   * Only a signed-in tab takes part: the sign-in page neither claims the game (it would lock the tab that is
   * playing) nor is locked by a claim. Asked each time, since a tab can sign in or out while open.
   */
  isSignedIn: () => boolean;
  onReplaced: (reason: SessionReplacedReason) => void;
}): TabSession {
  const { transport, tabId, isSignedIn, onReplaced } = options;
  const unsubscribe = transport.subscribe((message) => {
    if (!isSignedIn()) return;
    if (message.type === "device-replaced") onReplaced("device");
    else if (message.tabId !== tabId) onReplaced("tab");
  });
  if (isSignedIn()) transport.post({ type: "claim", tabId });

  return {
    announceDeviceReplaced: () => transport.post({ type: "device-replaced" }),
    stop: unsubscribe
  };
}
