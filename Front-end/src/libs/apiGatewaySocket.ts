import type { GameState, PlayerId } from "@backend/game/types";
import type { RoomUpdate } from "@backend/shared/multiplayer";

export type SocketListener = (...args: any[]) => void;

export interface RealtimeSocket {
  readonly connected: boolean;
  on(event: string, listener: SocketListener): RealtimeSocket;
  off(event: string, listener?: SocketListener): RealtimeSocket;
  disconnect(): void;
}

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

export class ApiGatewaySocket implements RealtimeSocket {
  private socket: WebSocket | null = null;
  private listeners = new Map<string, Set<SocketListener>>();
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
    if (this.socket?.readyState !== WebSocket.OPEN && this.socket?.readyState !== WebSocket.CONNECTING) {
      this.open();
    }
    return this;
  }

  public disconnect(): void {
    this.manuallyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    this.socket?.close(1000, "Client disconnected");
    this.socket = null;
  }

  public on(event: string, listener: SocketListener): this {
    const listeners = this.listeners.get(event) ?? new Set<SocketListener>();
    listeners.add(listener);
    this.listeners.set(event, listeners);
    return this;
  }

  public off(event: string, listener?: SocketListener): this {
    if (listener) this.listeners.get(event)?.delete(listener);
    else this.listeners.delete(event);
    return this;
  }

  public send(route: string, payload: Record<string, unknown> = {}, callback?: (response: any) => void): void {
    if (!this.connected || !this.socket) {
      callback?.({ ok: false, error: "WebSocket is not connected." });
      return;
    }
    this.socket.send(JSON.stringify({ route, ...payload }));
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
    if (this.username) url.searchParams.set("username", this.username);

    const socket = new WebSocket(url.toString());
    this.socket = socket;
    socket.onopen = () => {
      this.reconnectAttempt = 0;
      this.emit("connect");
    };
    socket.onmessage = (event) => this.handleMessage(String(event.data));
    socket.onerror = () => this.emit("connect_error", new Error("Unable to connect to API Gateway WebSocket."));
    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.emit("disconnect");
      if (!this.manuallyClosed) this.scheduleReconnect();
    };
  }

  private handleMessage(rawMessage: string): void {
    try {
      const message = JSON.parse(rawMessage) as GatewayMessage;
      if (!message.event) return;
      if (message.roomCode) this.roomCode = message.roomCode;
      if (message.event === "game:error") {
        this.emit("game:error", message.message || "Game server error.");
        return;
      }

      // AWS Lambdas may send state on matchmaking:found or room:update. Normalize
      // both into the RoomUpdate contract consumed by useGameMatch.
      if ((message.event === "room:update" || message.event === "matchmaking:found") && message.state && message.playerId) {
        this.emit("room:update", {
          roomCode: message.roomCode || this.roomCode || "",
          playerId: message.playerId,
          opponentConnected: message.opponentConnected ?? true,
          players: message.players ?? {},
          state: message.state,
          log: message.log ?? [],
        } satisfies RoomUpdate);
      }

      if (message.event !== "room:update") this.emit(message.event, message);
    } catch {
      this.emit("game:error", "The game server returned an invalid message.");
    }
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
