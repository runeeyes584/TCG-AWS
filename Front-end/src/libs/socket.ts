import type { GameAction, GameState, PlayerId } from "@backend/game/types";
import type { DeveloperResourceUpdate, RoomUpdate } from "@backend/shared/multiplayer";

type Callback = (response: { ok: true } | { ok: false; error: string }) => void;
type Listener = (...args: any[]) => void;

interface GatewayMessage {
  event?: string;
  message?: string;
  roomCode?: string;
  playerId?: PlayerId;
  state?: GameState;
  opponentConnected?: boolean;
  players?: RoomUpdate["players"];
  log?: RoomUpdate["log"];
  [key: string]: unknown;
}

class ApiGatewaySocket {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<Listener>>();
  private token = "";
  private username = "";
  private manuallyClosed = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private roomCode: string | undefined;

  public get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  public connect(token: string, username: string): this {
    this.token = token;
    this.username = username;
    this.manuallyClosed = false;

    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return this;
    }

    this.open();
    return this;
  }

  public disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.socket?.close(1000, "Client disconnected");
    this.socket = null;
  }

  public on(event: string, listener: Listener): this {
    const listeners = this.listeners.get(event) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  public off(event: string, listener?: Listener): this {
    if (listener) {
      this.listeners.get(event)?.delete(listener);
    } else {
      this.listeners.delete(event);
    }
    return this;
  }

  public send(route: string, payload: Record<string, unknown> = {}, callback?: Callback): void {
    if (!this.connected || !this.socket) {
      callback?.({ ok: false, error: "WebSocket is not connected." });
      return;
    }

    this.socket.send(JSON.stringify({ route, ...payload }));
    // API Gateway proxy responses are not Socket.IO acknowledgements.
    // Runtime failures arrive asynchronously as `game:error` messages.
    callback?.({ ok: true });
  }

  public getRoomCode(): string | undefined {
    return this.roomCode;
  }

  private open(): void {
    const configuredUrl = process.env.NEXT_PUBLIC_WS_URL;
    if (!configuredUrl) {
      queueMicrotask(() => this.emit("connect_error", new Error("NEXT_PUBLIC_WS_URL is not configured.")));
      return;
    }

    let url: URL;
    try {
      url = new URL(configuredUrl);
    } catch {
      queueMicrotask(() => this.emit("connect_error", new Error("NEXT_PUBLIC_WS_URL is invalid.")));
      return;
    }

    url.searchParams.set("token", this.token);
    if (this.username) {
      url.searchParams.set("username", this.username);
    }

    const socket = new WebSocket(url.toString());
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit("connect");
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as GatewayMessage;
        if (!message.event) return;
        if (message.roomCode) this.roomCode = message.roomCode;
        if (message.event === "game:error") {
          this.emit(message.event, message.message || "Game server error.");
          return;
        }
        this.emit(message.event, message);
      } catch {
        this.emit("game:error", "The game server returned an invalid message.");
      }
    };

    socket.onerror = () => {
      this.emit("connect_error", new Error("Unable to connect to API Gateway WebSocket."));
    };

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.emit("disconnect");
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempt, 15_000);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      if (!this.manuallyClosed) this.open();
    }, delay);
  }

  private emit(event: string, ...args: any[]): void {
    for (const listener of this.listeners.get(event) ?? []) listener(...args);
  }
}

class SocketManager {
  private socket: ApiGatewaySocket | null = null;

  public connect(token: string, username: string): ApiGatewaySocket {
    this.socket ??= new ApiGatewaySocket();
    return this.socket.connect(token, username);
  }

  public disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  public getSocket(): ApiGatewaySocket | null {
    return this.socket;
  }

  public createRoom(callback: Callback): void {
    callback({ ok: false, error: "Custom rooms require API Gateway routes that are not configured yet." });
  }

  public joinRoom(_roomCode: string, callback: Callback): void {
    callback({ ok: false, error: "Room rejoin requires an API Gateway route that is not configured yet." });
  }

  public dispatchAction(matchId: string | undefined, action: GameAction, callback: Callback): void {
    if (!matchId) {
      callback({ ok: false, error: "No active match was found." });
      return;
    }
    if (action.type === "SURRENDER") {
      this.socket?.send("game-surrender", { matchId, reason: "SURRENDER" }, callback);
      return;
    }
    this.socket?.send("game-action", { matchId, action }, callback);
  }

  public resetGame(callback: Callback): void {
    callback({ ok: false, error: "Game reset is disabled for API Gateway matches." });
  }

  public updateDeveloperResources(_updates: DeveloperResourceUpdate[], callback: Callback): void {
    callback({ ok: false, error: "Developer resource editing is disabled for API Gateway matches." });
  }

  public startMatchmaking(): void {
    const route = process.env.NEXT_PUBLIC_MATCHMAKING_ROUTE || "matchfinding-start";
    this.socket?.send(route);
  }

  public cancelMatchmaking(): void {
    this.socket?.send("matchfinding-cancel");
  }
}

export const socketManager = new SocketManager();
