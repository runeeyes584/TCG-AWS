import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onSessionReplaced, reportSessionReplaced, resetSessionReplacement, sessionReplacement } from "./sessionEvents";
import { createBrowserTabTransport, startTabSession, type TabMessage, type TabTransport } from "./tabSession";

describe("session replacement events", () => {
  beforeEach(() => resetSessionReplacement());

  it("tells every listener once, and a late listener at once", () => {
    const early = vi.fn();
    onSessionReplaced(early);

    reportSessionReplaced("tab");
    reportSessionReplaced("tab");
    const late = vi.fn();
    onSessionReplaced(late);

    expect(early).toHaveBeenCalledTimes(1);
    expect(late).toHaveBeenCalledWith("tab");
  });

  it("lets `device` replace `tab`, never the reverse: an ended session cannot be taken back", () => {
    const listener = vi.fn();
    onSessionReplaced(listener);

    reportSessionReplaced("tab");
    reportSessionReplaced("device");
    reportSessionReplaced("tab");

    expect(listener.mock.calls.map(([reason]) => reason)).toEqual(["tab", "device"]);
    expect(sessionReplacement()).toBe("device");
  });

  it("stops telling a listener that unsubscribed", () => {
    const listener = vi.fn();
    onSessionReplaced(listener)();

    reportSessionReplaced("device");

    expect(listener).not.toHaveBeenCalled();
  });
});

/** Tabs of one browser, as an in-memory bus: a message reaches every tab except the sender, as BroadcastChannel does. */
function browser() {
  const tabs = new Set<(message: TabMessage) => void>();
  const transport = (): TabTransport => {
    let own: ((message: TabMessage) => void) | undefined;
    return {
      post: (message) => tabs.forEach((handler) => { if (handler !== own) handler(message); }),
      subscribe: (handler) => {
        own = handler;
        tabs.add(handler);
        return () => tabs.delete(handler);
      }
    };
  };
  return { transport };
}

describe("one tab in play per browser", () => {
  it("locks the earlier tab when a later one opens; the later tab is not locked", () => {
    const { transport } = browser();
    const first = vi.fn();
    const second = vi.fn();

    startTabSession({ transport: transport(), tabId: "A", isSignedIn: () => true, onReplaced: first });
    startTabSession({ transport: transport(), tabId: "B", isSignedIn: () => true, onReplaced: second });

    expect(first).toHaveBeenCalledWith("tab");
    expect(second).not.toHaveBeenCalled();
  });

  it("gives the game back to a tab that claims it again (Use here reloads it)", () => {
    const { transport } = browser();
    const first = vi.fn();
    const second = vi.fn();
    startTabSession({ transport: transport(), tabId: "A", isSignedIn: () => true, onReplaced: first });
    startTabSession({ transport: transport(), tabId: "B", isSignedIn: () => true, onReplaced: second });

    startTabSession({ transport: transport(), tabId: "A-reloaded", isSignedIn: () => true, onReplaced: vi.fn() });

    expect(second).toHaveBeenCalledWith("tab");
  });

  it("leaves a signed-out tab alone, and a signed-out tab does not lock the one playing", () => {
    const { transport } = browser();
    const playing = vi.fn();
    const signInPage = vi.fn();
    startTabSession({ transport: transport(), tabId: "A", isSignedIn: () => true, onReplaced: playing });

    startTabSession({ transport: transport(), tabId: "B", isSignedIn: () => false, onReplaced: signInPage });
    startTabSession({ transport: transport(), tabId: "C", isSignedIn: () => true, onReplaced: vi.fn() });

    expect(playing).toHaveBeenCalledTimes(1);
    expect(signInPage).not.toHaveBeenCalled();
  });

  it("passes on a session that ended on another device to every tab of the browser", () => {
    const { transport } = browser();
    const other = vi.fn();
    startTabSession({ transport: transport(), tabId: "A", isSignedIn: () => true, onReplaced: other });
    const replaced = startTabSession({ transport: transport(), tabId: "B", isSignedIn: () => true, onReplaced: vi.fn() });
    other.mockClear();

    replaced.announceDeviceReplaced();

    expect(other).toHaveBeenCalledWith("device");
  });

  it("stops listening once stopped", () => {
    const { transport } = browser();
    const first = vi.fn();
    startTabSession({ transport: transport(), tabId: "A", isSignedIn: () => true, onReplaced: first }).stop();

    startTabSession({ transport: transport(), tabId: "B", isSignedIn: () => true, onReplaced: vi.fn() });

    expect(first).not.toHaveBeenCalled();
  });
});

describe("the browser transport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("carries a claim between tabs over BroadcastChannel", async () => {
    const first = vi.fn();
    const a = startTabSession({ transport: createBrowserTabTransport(), tabId: "A", isSignedIn: () => true, onReplaced: first });
    const b = startTabSession({ transport: createBrowserTabTransport(), tabId: "B", isSignedIn: () => true, onReplaced: vi.fn() });

    await vi.waitFor(() => expect(first).toHaveBeenCalledWith("tab"));
    a.stop();
    b.stop();
  });

  it("falls back to the storage event where BroadcastChannel is missing", () => {
    const listeners = new Set<(event: { key: string; newValue: string }) => void>();
    const store = new Map<string, string>();
    vi.stubGlobal("BroadcastChannel", undefined);
    vi.stubGlobal("window", {
      localStorage: {
        // The storage event fires in the other tabs only; here every subscriber stands for another tab.
        setItem: (key: string, value: string) => {
          store.set(key, value);
          listeners.forEach((listener) => listener({ key, newValue: value }));
        }
      },
      addEventListener: (_type: string, listener: (event: { key: string; newValue: string }) => void) => listeners.add(listener),
      removeEventListener: (_type: string, listener: (event: { key: string; newValue: string }) => void) => listeners.delete(listener)
    });
    const received: TabMessage[] = [];
    createBrowserTabTransport().subscribe((message) => received.push(message));

    createBrowserTabTransport().post({ type: "claim", tabId: "B" });

    expect(received).toEqual([{ type: "claim", tabId: "B" }]);
  });
});
