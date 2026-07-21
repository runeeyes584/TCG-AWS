import { createServer } from "node:http";
import { Server, Socket } from "socket.io";
import { buildDefaultDeck } from "../game/entities/defaultDeck";
import { applyAction, createInitialGameState } from "../game/core/engine";
import { MAX_MANA, MAX_SPELL_MANA } from "../game/rules/gameRules";
import { GameAction, GameState, GameValidationError, PlayerId } from "../game/types";
import { MatchmakingService } from "../matchmaking/matchmaking.service";
import type {
  ActionAck,
  ClientToServerEvents,
  DeveloperResourceUpdate,
  MatchPlayerProfile,
  RoomAck,
  ServerToClientEvents
} from "../shared/multiplayer";
import express from "express";
import authRoutes from "../auth/auth.routes";
import cookieParser from "cookie-parser";
import cors from "cors";
import { verifyToken } from "@backend/auth/verifyToken";
import { getUserById, recordMatchResult } from "@backend/user/user.repository";
import { OnlinePlayerManager } from "@backend/matchmaking/onlinePlayers";
import { authenticate } from "@backend/auth/auth.middleware";

interface RoomPlayer {
  socketId: string;
  userId: string;
  playerId: PlayerId;
  connected: boolean;
  profile: MatchPlayerProfile;
}

interface Room {
  code: string;
  players: RoomPlayer[];
  state: GameState;
  log: Array<{ id: number; message: string }>;
  ratingApplied: boolean;
  ratingApplying: boolean;
}

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

// const dev = process.env.NODE_ENV !== "production";
// const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 5000);
const hostname = process.env.SERVER_HOST ?? "0.0.0.0";
const developerToolsEnabled = process.env.ENABLE_DEVTOOLS === "true";
const allowedOrigins = (process.env.FRONTEND_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
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
const disconnectGraceTimers = new Map<string, NodeJS.Timeout>();
const disconnectGracePeriodMs = 45_000;
// const onlinePlayers = new Map<string, OnlinePlayer>();

const expressApp = express();

if (process.env.NODE_ENV === "production") {
    expressApp.set("trust proxy", 1);
}

expressApp.use(
    cors({
        origin: allowedOrigins,
        credentials: true
    })
);

expressApp.use(express.json());

expressApp.use(cookieParser());

expressApp.use("/auth", authRoutes);

expressApp.get("/matches/pending", authenticate, (req, res) => {
  const userId = (req as { user?: { sub?: unknown } }).user?.sub;
  if (typeof userId !== "string") {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const room = findPendingRoomForUser(userId);
  return res.json({
    success: true,
    match: room ? { roomCode: room.code } : null
  });
});

expressApp.post("/matches/pending/forfeit", authenticate, async (req, res) => {
  const userId = (req as { user?: { sub?: unknown } }).user?.sub;
  if (typeof userId !== "string") {
    return res.status(401).json({ success: false, message: "Unauthorized." });
  }

  const room = findPendingRoomForUser(userId);
  const player = room?.players.find((candidate) => candidate.userId === userId);
  if (!room || !player) {
    return res.status(404).json({ success: false, message: "No active match found." });
  }

  await forfeitPlayer(room, player.playerId, "left the match from the lobby.");
  return res.json({ success: true });
});

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
    socket.data.userId = payload.sub as string;
    socket.data.profile = {
      username: user.username,
      avatar: user.avatar,
      elo: user.elo
    } satisfies MatchPlayerProfile;
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
    const pendingRoom = findPendingRoomForUser(getSocketUserId(socket));
    if (pendingRoom) {
      socket.emit("game:error", "Resume or forfeit your current match before finding a new one.");
      return;
    }

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

    startRoomGame(room, "Match found. Game started.");

    broadcastRoom(room);

    socket1.emit("matchmaking:found");
    socket2.emit("matchmaking:found");
  });

  socket.on("matchmaking:cancel", () => {
    MatchmakingService.remove(socket.id);
  });

  socket.on("room:join", (roomCode, ack) => {
    const normalizedCode = typeof roomCode === "string"
      ? roomCode.trim().toUpperCase()
      : "";

    if (!normalizedCode) {
      ack({ ok: false, error: "Room code is required." });
      return;
    }

    const room = rooms.get(normalizedCode);
    if (!room) {
      ack({ ok: false, error: "Room not found." });
      return;
    }

    const existingPlayer = room.players.find(
      (player) => player.userId === getSocketUserId(socket)
    );
    if (existingPlayer) {
      if (existingPlayer.connected && existingPlayer.socketId !== socket.id) {
        ack({ ok: false, error: "This player is already connected to the room." });
        return;
      }

      existingPlayer.socketId = socket.id;
      existingPlayer.connected = true;
      clearDisconnectGraceTimer(room.code);
      socketRooms.set(socket.id, room.code);
      socket.join(room.code);
      room.log.unshift({
        id: Date.now(),
        message: `${existingPlayer.playerId} rejoined the room.`
      });
      ack({ ok: true, roomCode: room.code, playerId: existingPlayer.playerId });
      broadcastRoom(room);
      refreshTimer(room);
      return;
    }

    if (room.players.length >= 2) {
      ack({ ok: false, error: "Room is full." });
      return;
    }

    attachPlayer(socket, room, "P2");
    startRoomGame(room, "P2 joined the room. Game started.");
    ack({ ok: true, roomCode: room.code, playerId: "P2" });
    broadcastRoom(room);
    refreshTimer(room);
  });

  socket.on("game:action", async (action, ack) => {
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
      await settleRoomResult(room);
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

  socket.on("developer:resources", (updates, ack) => {
    if (!developerToolsEnabled) {
      replyError(socket, ack, "Developer tools are disabled.");
      return;
    }

    const room = getSocketRoom(socket);
    if (!room) {
      replyError(socket, ack, "Join a room first.");
      return;
    }

    if (!areValidDeveloperResourceUpdates(updates)) {
      replyError(socket, ack, "Invalid developer resource values.");
      return;
    }

    const nextState = structuredClone(room.state);
    for (const update of updates) {
      const player = nextState.players[update.playerId];
      player.mana = update.mana;
      player.spellMana = update.spellMana;
      player.maxMana = Math.max(player.maxMana, update.mana);
    }
    nextState.visualEvents = [];
    room.state = nextState;
    room.log.unshift({ id: Date.now(), message: "Developer resources updated." });
    ack?.({ ok: true });
    broadcastRoom(room);
  });

  socket.on("disconnect", () => {
    MatchmakingService.remove(socket.id);
    OnlinePlayerManager.remove(socket.id);

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
      clearDisconnectGraceTimer(room.code);
      rooms.delete(room.code);
      return;
    }

    scheduleDisconnectForfeit(room, player.playerId);
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
    log: [{ id: Date.now(), message: "Room created. Waiting for opponent." }],
    ratingApplied: false,
    ratingApplying: false
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

function startRoomGame(room: Room, message: string): void {
  if (room.players.length < 2 || room.state.started) {
    return;
  }

  room.state = applyAction(room.state, { type: "START_GAME", firstPlayerId: "P1" });
  room.log.unshift({ id: Date.now(), message });
  refreshTimer(room);
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
  const profile = socket.data.profile as MatchPlayerProfile | undefined;
  room.players.push({
    socketId: socket.id,
    userId: getSocketUserId(socket),
    playerId,
    connected: true,
    profile: profile ?? { username: "Unknown player", elo: 0 }
  });
  socketRooms.set(socket.id, room.code);
  socket.join(room.code);
}

function getSocketUserId(socket: GameSocket): string {
  const userId = socket.data.userId;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Socket is missing an authenticated user id.");
  }
  return userId;
}

function getSocketRoom(socket: GameSocket) {
  const roomCode = socketRooms.get(socket.id);
  return roomCode ? rooms.get(roomCode) : undefined;
}

function getSocketPlayerId(socket: GameSocket, room?: Room) {
  return room?.players.find((player) => player.socketId === socket.id)?.playerId;
}

function broadcastRoom(room: Room) {
  const playerProfiles = room.players.reduce<Partial<Record<PlayerId, MatchPlayerProfile>>>(
    (profiles, player) => {
      profiles[player.playerId] = player.profile;
      return profiles;
    },
    {}
  );

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
      players: playerProfiles,
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
  const timer = setTimeout(async () => {
    roomTimers.delete(room.code);
    if (rooms.get(room.code) !== room || room.state.winnerId) {
      return;
    }

    try {
      room.state = applyAction(room.state, { type: "TIME_OUT", playerId });
      appendActionLog(room, { type: "TIME_OUT", playerId });
      await settleRoomResult(room);
      broadcastRoom(room);
      refreshTimer(room);
    } catch {
      // A player action may have resolved first; either way, preserve a timer for the current state.
      refreshTimer(room);
    }
  }, room.state.turnDuration + 2_000);
  roomTimers.set(room.code, timer);
}

function scheduleDisconnectForfeit(room: Room, playerId: PlayerId): void {
  clearDisconnectGraceTimer(room.code);
  const timer = setTimeout(() => {
    disconnectGraceTimers.delete(room.code);
    const player = room.players.find((candidate) => candidate.playerId === playerId);
    if (rooms.get(room.code) !== room || room.state.winnerId || player?.connected) {
      return;
    }

    void forfeitPlayer(room, playerId, "did not reconnect within 45 seconds.");
  }, disconnectGracePeriodMs);
  disconnectGraceTimers.set(room.code, timer);
}

function clearDisconnectGraceTimer(roomCode: string): void {
  const timer = disconnectGraceTimers.get(roomCode);
  if (timer) {
    clearTimeout(timer);
    disconnectGraceTimers.delete(roomCode);
  }
}

async function forfeitPlayer(room: Room, playerId: PlayerId, reason: string): Promise<void> {
  if (room.state.winnerId) {
    return;
  }

  room.state = applyAction(room.state, { type: "SURRENDER", playerId });
  room.log.unshift({ id: Date.now(), message: `${playerId} ${reason}` });
  clearRoomTimer(room.code);
  clearDisconnectGraceTimer(room.code);
  await settleRoomResult(room);
  broadcastRoom(room);
}

async function settleRoomResult(room: Room): Promise<void> {
  if (!room.state.winnerId || room.ratingApplied || room.ratingApplying || room.players.length !== 2) {
    return;
  }

  const winner = room.players.find((player) => player.playerId === room.state.winnerId);
  const loser = room.players.find((player) => player.playerId !== room.state.winnerId);
  if (!winner || !loser) {
    return;
  }

  room.ratingApplying = true;
  clearRoomTimer(room.code);
  clearDisconnectGraceTimer(room.code);
  try {
    const result = await recordMatchResult(winner.userId, loser.userId);
    winner.profile.elo = result.winner.elo;
    loser.profile.elo = result.loser.elo;
    room.ratingApplied = true;
    room.log.unshift({ id: Date.now(), message: "Match result recorded." });
  } catch (error) {
    console.error(`Unable to settle result for room ${room.code}:`, error);
  } finally {
    room.ratingApplying = false;
  }
}

function findPendingRoomForUser(userId: string): Room | undefined {
  return [...rooms.values()].find(
    (room) =>
      room.state.started &&
      !room.state.winnerId &&
      room.players.some((player) => player.userId === userId && !player.connected)
  );
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

function areValidDeveloperResourceUpdates(
  updates: DeveloperResourceUpdate[]
): boolean {
  if (!Array.isArray(updates) || updates.length !== 2) {
    return false;
  }

  const updatedPlayers = new Set<PlayerId>();
  for (const update of updates) {
    if (
      !update ||
      (update.playerId !== "P1" && update.playerId !== "P2") ||
      !Number.isInteger(update.mana) ||
      !Number.isInteger(update.spellMana) ||
      update.mana < 0 ||
      update.mana > MAX_MANA ||
      update.spellMana < 0 ||
      update.spellMana > MAX_SPELL_MANA
    ) {
      return false;
    }
    updatedPlayers.add(update.playerId);
  }

  return updatedPlayers.size === 2;
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
