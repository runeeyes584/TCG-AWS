import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { socketManager } from "./socket";

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
});
