import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { buildDefaultDeck } from "../game/entities/defaultDeck";
import { applyAction, createInitialGameState } from "../game/core/engine";
import { GameAction, GameState, GameValidationError, PlayerId } from "../game/types";
import { MatchmakingService } from "../matchmaking/matchmaking.service";
import type {
  ActionAck,
  ClientToServerEvents,
  RoomAck,
  ServerToClientEvents
} from "../shared/multiplayer";
import express from "express";
import authRoutes from "../auth/auth.routes";
import cookieParser from "cookie-parser";
import cors from "cors";
import { verifyToken } from "@backend/auth/verifyToken";
import { getUserById } from "@backend/user/user.repository";
import { OnlinePlayerManager } from "@backend/matchmaking/onlinePlayers";

interface RoomPlayer {
  socketId: string;
  playerId: PlayerId;
  connected: boolean;
}

interface Room {
  code: string;
  players: RoomPlayer[];
  state: GameState;
  log: Array<{ id: number; message: string }>;
}

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// const dev = process.env.NODE_ENV !== "production";
// const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 5000);
const hostname = "localhost";
// const app = next({ dev, hostname, port, dir: resolve(process.cwd(), "Front-end") });
// const app = next({
//     dev,
//     hostname,
//     port,
//     dir: resolve(process.cwd(), "Front-end")
// });
// const handle = app.getRequestHandler();
const rooms = new Map<string, Room>();
const socketRooms = new Map<string, string>();
const roomTimers = new Map<string, NodeJS.Timeout>();
// const onlinePlayers = new Map<string, OnlinePlayer>();

const expressApp = express();

expressApp.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true
    })
);

expressApp.use(express.json());

expressApp.use(cookieParser());

expressApp.use("/auth", authRoutes);

const httpServer = createServer(expressApp);

// await app.prepare();

// const expressApp = express();

// expressApp.use(express.json());
// expressApp.use(cookieParser());

// expressApp.use("/auth", authRoutes);

// // Chuyển mọi request còn lại sang Next.js
// expressApp.use((req, res) => {
//     return handle(req, res);
// });

// const httpServer = createServer(expressApp);

// const httpServer = createServer((request, response) => {
//   handle(request, response);
// });

httpServer.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}`);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true
  }
});

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;

    if (typeof token !== "string" || token.trim().length === 0) {
      return next(new Error("Unauthorized: missing access token."));
    }

    const payload = await verifyToken(token);

    const email = payload.username as string;
    const user = await getUserById(payload.sub as string);

    if (!user) {
      return next(new Error("Unauthorized: user not found."));
    }

    OnlinePlayerManager.add({
      socketId: socket.id,
      user,
      searching: false,
      connectedAt: Date.now()
    });

    socket.data.email = email;
    next();
  } catch (err) {
    console.error("Socket auth error:", err);

    const message =
      err instanceof Error && /Compact JWS|JWT|token/i.test(err.message)
        ? "Unauthorized: invalid access token."
        : err instanceof Error
          ? err.message
          : "Unauthorized";

    next(new Error(message));
  }
});

io.on("connection", (socket) => {
  socket.on("room:create", (ack) => {
    const room = createRoom();
    attachPlayer(socket, room, "P1");
    ack({ ok: true, roomCode: room.code, playerId: "P1" });
    broadcastRoom(room);
  });

  socket.on("matchmaking:start", () => {
    const match = MatchmakingService.enqueue(socket.id);

    if (!match) {

        socket.emit("matchmaking:searching");

        return;
    }


    const room = createRoom();

    const socket1 = io.sockets.sockets.get(match.player1.socketId);
    const socket2 = io.sockets.sockets.get(match.player2.socketId);

    if (!socket1 || !socket2) {
        return;
    }

    attachPlayer(socket1, room, "P1");
    attachPlayer(socket2, room, "P2");

    room.log.unshift({
        id: Date.now(),
        message: "Match found."
    });

    broadcastRoom(room);

    socket1.emit("matchmaking:found");
    socket2.emit("matchmaking:found");
  });

  socket.on("matchmaking:cancel", () => {
    MatchmakingService.remove(socket.id);
  });

  socket.on("room:join", (roomCode, ack) => {
    const normalizedCode = roomCode.trim().toUpperCase();
    const room = rooms.get(normalizedCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }

    if (room.players.some((player) => player.socketId === socket.id)) {
      const existing = room.players.find((player) => player.socketId === socket.id);
      if (existing) {
        existing.connected = true;
        socketRooms.set(socket.id, room.code);
      }
      ack({ ok: true, roomCode: room.code, playerId: existing?.playerId ?? "P1" });
      broadcastRoom(room);
      return;
    }

    const disconnectedPlayer = room.players.find((player) => !player.connected);
    if (disconnectedPlayer) {
      disconnectedPlayer.socketId = socket.id;
      disconnectedPlayer.connected = true;
      socketRooms.set(socket.id, room.code);
      socket.join(room.code);
      room.log.unshift({
        id: Date.now(),
        message: `${disconnectedPlayer.playerId} rejoined the room.`
      });
      ack({ ok: true, roomCode: room.code, playerId: disconnectedPlayer.playerId });
      broadcastRoom(room);
      refreshTimer(room);
      return;
    }

    if (room.players.length >= 2) {
      ack({ ok: false, error: "Room is full." });
      return;
    }

    attachPlayer(socket, room, "P2");
    room.log.unshift({
      id: Date.now(),
      message: "P2 joined the room."
    });
    ack({ ok: true, roomCode: room.code, playerId: "P2" });
    broadcastRoom(room);
    refreshTimer(room);
  });

  socket.on("game:action", (action, ack) => {
    const room = getSocketRoom(socket);
    const playerId = getSocketPlayerId(socket, room);
    if (!room || !playerId) {
      replyError(socket, ack, "Join a room first.");
      return;
    }

    if (!canSubmitAction(playerId, action)) {
      replyError(socket, ack, "You cannot submit an action for the other player.");
      return;
    }

    try {
      room.state = applyAction(room.state, action);
      appendActionLog(room, action);
      ack?.({ ok: true });
      broadcastRoom(room);
      refreshTimer(room);
    } catch (error) {
      replyError(
        socket,
        ack,
        error instanceof GameValidationError ? error.message : "Action failed."
      );
    }
  });

  socket.on("game:reset", (ack) => {
    const room = getSocketRoom(socket);
    if (!room) {
      replyError(socket, ack, "Join a room first.");
      return;
    }

    room.state = createRoomState();
    room.log = [{ id: Date.now(), message: "Room game reset." }];
    ack?.({ ok: true });
    broadcastRoom(room);
    refreshTimer(room);
  });

  socket.on("disconnect", () => {
    const roomCode = socketRooms.get(socket.id);
    if (!roomCode) {
      return;
    }

    const room = rooms.get(roomCode);
    socketRooms.delete(socket.id);
    if (!room) {
      return;
    }

    const player = room.players.find((candidate) => candidate.socketId === socket.id);
    if (!player) {
      return;
    }

    player.connected = false;
    room.log.unshift({ id: Date.now(), message: "A player disconnected." });
    if (!room.players.some((candidate) => candidate.connected) || room.state.winnerId) {
      clearRoomTimer(room.code);
      rooms.delete(room.code);
      return;
    }

    MatchmakingService.remove(socket.id);

OnlinePlayerManager.remove(socket.id);

    broadcastRoom(room);
  });
});

httpServer.listen(port, hostname, () => {
  console.log(`Kaleidoscope socket server ready at http://${hostname}:${port}`);
});

function createRoom(): Room {
  let code = createRoomCode();
  while (rooms.has(code)) {
    code = createRoomCode();
  }

  const room: Room = {
    code,
    players: [],
    state: createRoomState(),
    log: [{ id: Date.now(), message: "Room created. Waiting for opponent." }]
  };
  rooms.set(code, room);
  return room;
}

function createRoomState() {
  return createInitialGameState(
    buildDefaultDeck("P1"),
    buildDefaultDeck("P2"),
    Date.now()
  );
}

function createRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function attachPlayer(socket: GameSocket, room: Room, playerId: PlayerId) {
  room.players.push({ socketId: socket.id, playerId, connected: true });
  socketRooms.set(socket.id, room.code);
  socket.join(room.code);
}

function getSocketRoom(socket: GameSocket) {
  const roomCode = socketRooms.get(socket.id);
  return roomCode ? rooms.get(roomCode) : undefined;
}

function getSocketPlayerId(socket: GameSocket, room?: Room) {
  return room?.players.find((player) => player.socketId === socket.id)?.playerId;
}

function broadcastRoom(room: Room) {
  for (const player of room.players) {
    if (!player.connected) {
      continue;
    }
    const opponentId = player.playerId === "P1" ? "P2" : "P1";
    io.to(player.socketId).emit("room:update", {
      roomCode: room.code,
      playerId: player.playerId,
      opponentConnected: room.players.some(
        (candidate) => candidate.playerId === opponentId && candidate.connected
      ),
      state: redactStateForPlayer(room.state, player.playerId),
      log: room.log.slice(0, 80)
    });
  }
}

function refreshTimer(room: Room): void {
  clearRoomTimer(room.code);
  if (!room.state.started || room.state.winnerId || room.players.length < 2) {
    return;
  }

  const playerId = room.state.priorityPlayerId;
  const timer = setTimeout(() => {
    roomTimers.delete(room.code);
    if (rooms.get(room.code) !== room || room.state.winnerId) {
      return;
    }

    try {
      room.state = applyAction(room.state, { type: "TIME_OUT", playerId });
      appendActionLog(room, { type: "TIME_OUT", playerId });
      broadcastRoom(room);
      refreshTimer(room);
    } catch {
      // A player action may have resolved first; either way, preserve a timer for the current state.
      refreshTimer(room);
    }
  }, room.state.turnDuration + 2_000);
  roomTimers.set(room.code, timer);
}

function clearRoomTimer(roomCode: string): void {
  const timer = roomTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    roomTimers.delete(roomCode);
  }
}

function redactStateForPlayer(state: GameState, viewerId: PlayerId): GameState {
  const visibleState = structuredClone(state);
  const opponentId = viewerId === "P1" ? "P2" : "P1";
  const opponent = visibleState.players[opponentId];

  opponent.hand = opponent.hand.map((_, index) => ({
    instanceId: `hidden-hand-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));
  opponent.deck = opponent.deck.map((_, index) => ({
    instanceId: `hidden-deck-${opponentId}-${index}`,
    cardId: "hidden-card",
    ownerId: opponentId
  }));

  if (visibleState.pendingChoice?.playerId !== viewerId && visibleState.pendingChoice) {
    visibleState.pendingChoice = {
      ...visibleState.pendingChoice,
      chosenTargets: {},
      costTargets: undefined,
      playUnit: visibleState.pendingChoice.playUnit
        ? { ...visibleState.pendingChoice.playUnit, costTargets: undefined }
        : undefined
    };
  }

  return visibleState;
}

function canSubmitAction(playerId: PlayerId, action: GameAction) {
  if ("playerId" in action && action.playerId !== playerId) {
    return false;
  }

  if (action.type === "START_GAME") {
    return playerId === "P1";
  }

  return true;
}

function appendActionLog(room: Room, action: GameAction) {
  room.log.unshift({ id: Date.now() + Math.random(), message: describeAction(action) });
  for (const event of room.state.visualEvents) {
    room.log.unshift({
      id: Date.now() + Math.random(),
      message: describeVisualEvent(event)
    });
  }
}

function describeAction(action: GameAction): string {
  switch (action.type) {
    case "START_GAME":
      return "Game started.";
    case "DRAW_CARD":
      return `${action.playerId} drew ${action.count ?? 1} card(s).`;
    case "DISCARD_CARD":
      return `${action.playerId} discarded a card.`;
    case "START_ROUND":
      return "Round advanced.";
    case "PLAY_UNIT":
      return `${action.playerId} played a unit.`;
    case "PLAY_SPELL":
      return `${action.playerId} played a spell.`;
    case "SUBMIT_ABILITY_TARGETS":
      return `${action.playerId} submitted ability targets.`;
    case "CANCEL_PENDING_CHOICE":
      return `${action.playerId} cancelled an ability choice.`;
    case "DECLARE_ATTACKER":
      return `${action.playerId} declared an attacker.`;
    case "REMOVE_ATTACKER":
      return `${action.playerId} removed an attacker.`;
    case "COMMIT_ATTACK":
      return `${action.playerId} committed attackers.`;
    case "DECLARE_BLOCKER":
      return `${action.playerId} declared a blocker.`;
    case "REMOVE_BLOCKER":
      return `${action.playerId} removed a blocker.`;
    case "COMMIT_BLOCKS":
      return `${action.playerId} committed blocks.`;
    case "RESOLVE_COMBAT":
      return "Combat resolved.";
    case "END_TURN":
      return `${action.playerId} passed.`;
    case "TIME_OUT":
      return `${action.playerId} timed out.`;
    case "SURRENDER":
      return `${action.playerId} surrendered.`;
  }
}

function describeVisualEvent(event: GameState["visualEvents"][number]): string {
  switch (event.type) {
    case "DAMAGE":
      return `${event.targetId} took ${event.amount} damage.`;
    case "HEAL":
      return `${event.targetId} healed ${event.amount}.`;
    case "DRAW":
      return `${event.playerId} drew ${event.count} card(s).`;
    case "BUFF":
      return `${event.targetId} gained ${event.attackDelta}/${event.healthDelta}.`;
    case "DEBUFF":
      return `${event.targetId} changed ${event.attackDelta}/${event.healthDelta}.`;
    case "TRIGGER_ACTIVATED":
      return `Trigger activated: ${event.effectName}.`;
    case "HAND_LIMIT_DISCARD_REQUIRED":
      return `${event.playerId} must discard from ${event.handSize} to ${event.downTo} cards.`;
    case "CHAMPION_LEVELED_UP":
      return `${event.playerId}'s champion leveled up.`;
    case "SUMMON":
      return `${event.playerId} revived a unit.`;
    case "AFK_WARNING":
      return `${event.playerId} timed out (${event.afkCount}/3).`;
  }
}

function replyError(socket: GameSocket, ack: ActionAck | undefined, error: string) {
  ack?.({ ok: false, error });
  socket.emit("game:error", error);
}
