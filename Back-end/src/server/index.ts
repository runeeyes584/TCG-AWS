import { createServer } from "node:http";
import { resolve } from "node:path";
import next from "next";
import { Server, Socket } from "socket.io";
import { buildDefaultDeck } from "../game/defaultDeck";
import { applyAction, createInitialGameState } from "../game/engine";
import { GameAction, GameState, GameValidationError, PlayerId } from "../game/types";
import type {
  ActionAck,
  ClientToServerEvents,
  RoomAck,
  ServerToClientEvents
} from "../shared/multiplayer";

interface RoomPlayer {
  socketId: string;
  playerId: PlayerId;
}

interface Room {
  code: string;
  players: RoomPlayer[];
  state: GameState;
  log: Array<{ id: number; message: string }>;
}

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4000);
const app = next({ dev, hostname, port, dir: resolve(process.cwd(), "Front-end") });
const handle = app.getRequestHandler();
const rooms = new Map<string, Room>();
const socketRooms = new Map<string, string>();

await app.prepare();

const httpServer = createServer((request, response) => {
  handle(request, response);
});

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: true
  }
});

io.on("connection", (socket) => {
  socket.on("room:create", (ack) => {
    const room = createRoom();
    attachPlayer(socket, room, "P1");
    ack({ ok: true, roomCode: room.code, playerId: "P1" });
    broadcastRoom(room);
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
      ack({ ok: true, roomCode: room.code, playerId: existing?.playerId ?? "P1" });
      broadcastRoom(room);
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

    room.players = room.players.filter((player) => player.socketId !== socket.id);
    room.log.unshift({ id: Date.now(), message: "A player disconnected." });
    if (room.players.length === 0) {
      rooms.delete(room.code);
      return;
    }

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
  room.players.push({ socketId: socket.id, playerId });
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
    io.to(player.socketId).emit("room:update", {
      roomCode: room.code,
      playerId: player.playerId,
      opponentConnected: room.players.length === 2,
      state: redactStateForPlayer(room.state, player.playerId),
      log: room.log.slice(0, 80)
    });
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
    case "CHAMPION_LEVELED_UP":
      return `${event.playerId}'s champion leveled up.`;
  }
}

function replyError(socket: GameSocket, ack: ActionAck | undefined, error: string) {
  ack?.({ ok: false, error });
  socket.emit("game:error", error);
}
