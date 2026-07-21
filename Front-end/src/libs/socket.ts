import { io, type Socket } from "socket.io-client";
import type { GameAction } from "@backend/game/types";
import type {
  ClientToServerEvents,
  DeveloperResourceUpdate,
  MatchmakingDeckSelection,
  ServerToClientEvents,
} from "@backend/shared/multiplayer";
import { ApiGatewaySocket, type RealtimeSocket } from "./apiGatewaySocket";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
type Callback = (response: { ok: true } | { ok: false; error: string }) => void;

class SocketManager {
  private socket: GameSocket | ApiGatewaySocket | null = null;
  private readonly useApiGateway = Boolean(process.env.NEXT_PUBLIC_WS_URL);
  private readonly socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    || (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

  public connect(token: string, username: string): RealtimeSocket {
    if (this.useApiGateway) {
      if (!(this.socket instanceof ApiGatewaySocket)) this.socket = new ApiGatewaySocket();
      return this.socket.connect(token, username);
    }

    if (!this.socket) {
      if (!this.socketUrl) {
        throw new Error("NEXT_PUBLIC_WS_URL or NEXT_PUBLIC_SOCKET_URL is required outside local development.");
      }
      this.socket = io(this.socketUrl, {
        autoConnect: false,
        transports: ["websocket", "polling"],
        auth: { token, email: username },
      });
    }
    const socket = this.socket as GameSocket;
    socket.auth = { token, email: username };
    socket.connect();
    return socket as unknown as RealtimeSocket;
  }

  public disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  public getSocket(): RealtimeSocket | null {
    return this.socket as RealtimeSocket | null;
  }

  public createRoom(selection: MatchmakingDeckSelection | undefined, callback: Callback): void {
    if (this.socket instanceof ApiGatewaySocket) {
      callback({ ok: false, error: "Custom rooms are not deployed to API Gateway yet." });
      return;
    }
    this.socket?.emit("room:create", selection, callback);
  }

  public joinRoom(roomCode: string, selection: MatchmakingDeckSelection | undefined, callback: Callback): void {
    if (this.socket instanceof ApiGatewaySocket) {
      callback({ ok: false, error: "Custom room rejoin is not deployed to API Gateway yet." });
      return;
    }
    this.socket?.emit("room:join", roomCode, selection, callback);
  }

  public dispatchAction(action: GameAction, callback: Callback): void {
    if (this.socket instanceof ApiGatewaySocket) {
      const matchId = this.socket.getRoomCode();
      if (!matchId) {
        callback({ ok: false, error: "No active match was found." });
        return;
      }
      const route = action.type === "SURRENDER" ? "game-surrender" : "game-action";
      const payload = action.type === "SURRENDER"
        ? { matchId, reason: "SURRENDER" }
        : { matchId, action };
      this.socket.send(route, payload, callback);
      return;
    }
    this.socket?.emit("game:action", action, callback);
  }

  public resetGame(callback: Callback): void {
    if (this.socket instanceof ApiGatewaySocket) {
      callback({ ok: false, error: "Game reset is disabled for API Gateway matches." });
      return;
    }
    this.socket?.emit("game:reset", callback);
  }

  public updateDeveloperResources(updates: DeveloperResourceUpdate[], callback: Callback): void {
    if (this.socket instanceof ApiGatewaySocket) {
      callback({ ok: false, error: "Developer resource editing is disabled for API Gateway matches." });
      return;
    }
    this.socket?.emit("developer:resources", updates, callback);
  }

  public startMatchmaking(selection?: MatchmakingDeckSelection): void {
    if (this.socket instanceof ApiGatewaySocket) {
      const route = process.env.NEXT_PUBLIC_MATCHMAKING_ROUTE || "matchfinding-start";
      this.socket.send(route, selection ? { deckSelection: selection } : {});
      return;
    }
    this.socket?.emit("matchmaking:start", selection);
  }

  public cancelMatchmaking(): void {
    if (this.socket instanceof ApiGatewaySocket) {
      this.socket.send("matchfinding-cancel");
      return;
    }
    this.socket?.emit("matchmaking:cancel");
  }
}

export const socketManager = new SocketManager();
