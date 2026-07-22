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
  private readonly socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL
    || (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "");

  public connect(token: string, username: string): RealtimeSocket {
    if (process.env.NEXT_PUBLIC_WS_URL) {
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
      this.socket.send("room-create", selection ? { deckSelection: selection } : {}, callback);
      return;
    }
    this.socket?.emit("room:create", selection, callback);
  }

  public joinRoom(
    roomCode: string,
    selection: MatchmakingDeckSelection | undefined,
    callback: Callback
  ): void {
    if (this.socket instanceof ApiGatewaySocket) {
      this.socket.send(
        "room-join",
        { roomCode, ...(selection ? { deckSelection: selection } : {}) },
        callback
      );
      return;
    }
    this.socket?.emit("room:join", roomCode, selection, callback);
  }

  public dispatchAction(
    matchId: string | undefined,
    action: GameAction,
    callback: Callback
  ): void {
    if (this.socket instanceof ApiGatewaySocket) {
      const resolvedMatchId = matchId || this.socket.getRoomCode();
      if (!resolvedMatchId) {
        callback({ ok: false, error: "No active match was found." });
        return;
      }
      const route = action.type === "SURRENDER" ? "game-surrender" : "game-action";
      const payload = action.type === "SURRENDER"
        ? { matchId: resolvedMatchId, reason: "SURRENDER" }
        : { matchId: resolvedMatchId, action };
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

  /** Resume is intentionally distinct from matchmaking: it represents the
   * player's explicit choice in the unfinished-match dialog. */
  public resumeMatch(): void {
    if (this.socket instanceof ApiGatewaySocket) {
      const route = process.env.NEXT_PUBLIC_MATCHMAKING_ROUTE || "matchfinding-start";
      this.socket.send(route, { resume: true });
      return;
    }
    // The local Socket.IO server owns room reattachment on connect. Keep this
    // method a no-op there so the production-only safety protocol cannot alter
    // the local transport contract.
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
