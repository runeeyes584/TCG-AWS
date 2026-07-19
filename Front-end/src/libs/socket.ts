import { io, type Socket } from "socket.io-client";
import type { GameAction } from "@backend/game/types";
import type {
  ClientToServerEvents,
  DeveloperResourceUpdate,
  ServerToClientEvents
} from "@backend/shared/multiplayer";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

class SocketManager {
  private socket: GameSocket | null = null;
  private socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";

  public connect(token: string, email: string): GameSocket {
    if (!this.socket) {
      this.socket = io(this.socketUrl, {
        autoConnect: false,
        transports: ["websocket", "polling"],
        auth: { token, email }
      });
    }
    
    // Socket.IO reads auth during its handshake, so refresh it before reconnecting.
    this.socket.auth = { token, email };
    this.socket.connect();
    return this.socket;
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  public getSocket(): GameSocket | null {
    return this.socket;
  }

  // --- API Methods (Emit) ---
  public createRoom(callback: (response: any) => void) {
    this.socket?.emit("room:create", callback);
  }

  public joinRoom(roomCode: string, callback: (response: any) => void) {
    this.socket?.emit("room:join", roomCode, callback);
  }

  public dispatchAction(action: GameAction, callback: (response: any) => void) {
    this.socket?.emit("game:action", action, callback);
  }

  public resetGame(callback: (response: any) => void) {
    this.socket?.emit("game:reset", callback);
  }

  public updateDeveloperResources(
    updates: DeveloperResourceUpdate[],
    callback: (response: any) => void
  ) {
    this.socket?.emit("developer:resources", updates, callback);
  }

  public startMatchmaking() {
    this.socket?.emit("matchmaking:start");
  }

  public cancelMatchmaking() {
    this.socket?.emit("matchmaking:cancel");
  }
}

// Export a singleton instance
export const socketManager = new SocketManager();
