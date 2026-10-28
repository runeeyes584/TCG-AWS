import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { io, verifySession } = vi.hoisted(() => {
  // The socket manager reads the local server address once, when the module loads.
  process.env.NEXT_PUBLIC_SOCKET_URL = "http://localhost:5000";
  return { io: vi.fn(), verifySession: vi.fn(async () => undefined) };
});
vi.mock("socket.io-client", () => ({ io }));
vi.mock("./api", () => ({ verifySession }));

import { socketManager } from "./socket";
import { resetSessionReplacement, sessionReplacement } from "./session/sessionEvents";

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static latest: FakeWebSocket | undefined;

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public readonly url: string) {
    FakeWebSocket.latest = this;
  }

  send(payload: string) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = FakeWebSocket.CONNECTING;
    this.onclose?.();
  }

  open() {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }
}

describe("API Gateway private-room socket routes", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", FakeWebSocket);
    process.env.NEXT_PUBLIC_WS_URL = "wss://example.test/dev";
  });

  afterEach(() => {
    socketManager.disconnect();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WS_URL;
    FakeWebSocket.latest = undefined;
  });

  it("sends room-create using the API Gateway route selection field", () => {
    socketManager.connect("token", "player");
    const socket = FakeWebSocket.latest!;
    socket.open();

    socketManager.createRoom(undefined, () => undefined);

    expect(JSON.parse(socket.sent[0])).toEqual({ route: "room-create" });
  });

  it("sends room-join with the normalized room code payload", () => {
    socketManager.connect("token", "player");
    const socket = FakeWebSocket.latest!;
    socket.open();

    socketManager.joinRoom("ABC2D3", undefined, () => undefined);

    expect(JSON.parse(socket.sent[0])).toEqual({ route: "room-join", roomCode: "ABC2D3" });
  });

  it("sends an explicit resume command rather than matchmaking", () => {
    socketManager.connect("token", "player");
    const socket = FakeWebSocket.latest!;
    socket.open();

    socketManager.resumeMatch("MATCH-123");

    expect(JSON.parse(socket.sent[0])).toEqual({
      route: "matchfinding-start",
      resume: true,
      matchId: "MATCH-123"
    });
  });

  it("sends public matchmaking through the configured route", () => {
    socketManager.connect("token", "player");
    const socket = FakeWebSocket.latest!;
    socket.open();

    socketManager.startMatchmaking({
      deckId: "starter",
      cardIds: ["card-1", "card-2"]
    });

    expect(JSON.parse(socket.sent[0])).toEqual({
      route: "matchfinding-start",
      deckSelection: {
        deckId: "starter",
        cardIds: ["card-1", "card-2"]
      }
    });
  });
});

describe("local Socket.IO resume", () => {
  const emit = vi.fn();

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_WS_URL;
    emit.mockClear();
    io.mockReturnValue({ emit, on: vi.fn(), off: vi.fn(), connect: vi.fn(), disconnect: vi.fn(), connected: true });
    socketManager.connect("token", "player");
  });

  afterEach(() => {
    socketManager.disconnect();
  });

  it("joins the room by its code, which is how the local server reattaches a player who left", () => {
    const callback = vi.fn();

    socketManager.resumeMatch("ABC234", callback);

    expect(emit).toHaveBeenCalledWith("room:join", "ABC234", undefined, callback);
  });

  it("does not need a callback", () => {
    socketManager.resumeMatch("ABC234");

    expect(emit).toHaveBeenCalledWith("room:join", "ABC234", undefined, expect.any(Function));
  });
});

describe("a connection pushed out because the player plays from somewhere else", () => {
  beforeEach(() => {
    resetSessionReplacement();
    verifySession.mockClear();
    vi.stubGlobal("WebSocket", FakeWebSocket);
    process.env.NEXT_PUBLIC_WS_URL = "wss://example.test/dev";
  });

  afterEach(() => {
    socketManager.disconnect();
    vi.unstubAllGlobals();
    delete process.env.NEXT_PUBLIC_WS_URL;
    FakeWebSocket.latest = undefined;
    resetSessionReplacement();
  });

  const receive = (socket: FakeWebSocket, message: unknown) => socket.onmessage?.({ data: JSON.stringify(message) });

  it("reports why and closes the socket for good, so it cannot push the new tab back out", () => {
    socketManager.connect("token", "player");
    const socket = FakeWebSocket.latest!;
    socket.open();

    receive(socket, { event: "session:replaced", reason: "tab" });

    expect(sessionReplacement()).toBe("tab");
    expect(socketManager.getSocket()).toBeNull();
  });

  it("treats an unknown reason as a session that ended elsewhere", () => {
    socketManager.connect("token", "player");
    const socket = FakeWebSocket.latest!;
    socket.open();

    receive(socket, { event: "session:replaced" });

    expect(sessionReplacement()).toBe("device");
  });

  it("refuses to connect again once replaced", () => {
    socketManager.connect("token", "player");
    receive(FakeWebSocket.latest!, { event: "session:replaced", reason: "device" });

    expect(() => socketManager.connect("token", "player")).toThrow("active somewhere else");
  });

  it("asks the server why when API Gateway refuses the connection", () => {
    socketManager.connect("token", "player");

    FakeWebSocket.latest!.onerror?.();

    expect(verifySession).toHaveBeenCalledTimes(1);
  });
});

describe("the local server refusing a replaced session", () => {
  const handlers = new Map<string, (...args: any[]) => void>();

  beforeEach(() => {
    resetSessionReplacement();
    delete process.env.NEXT_PUBLIC_WS_URL;
    handlers.clear();
    io.mockReturnValue({
      emit: vi.fn(),
      on: vi.fn((event: string, handler: (...args: any[]) => void) => handlers.set(event, handler)),
      off: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      connected: false
    });
  });

  afterEach(() => {
    socketManager.disconnect();
    resetSessionReplacement();
  });

  it("reports a session that ended elsewhere from the connect error", () => {
    socketManager.connect("token", "player");

    handlers.get("connect_error")?.(new Error("SESSION_REPLACED"));

    expect(sessionReplacement()).toBe("device");
    expect(socketManager.getSocket()).toBeNull();
  });

  it("leaves any other connect error to the page", () => {
    socketManager.connect("token", "player");

    handlers.get("connect_error")?.(new Error("Unauthorized: invalid access token."));

    expect(sessionReplacement()).toBeUndefined();
  });
});

