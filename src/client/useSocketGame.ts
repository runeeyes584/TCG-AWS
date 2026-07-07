"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import type { GameController } from "../components/GameBoard";
import { buildDefaultDeck } from "../game/defaultDeck";
import { createInitialGameState } from "../game/engine";
import type { GameAction, GameState, PlayerId } from "../game/types";
import type {
  ClientToServerEvents,
  RoomUpdate,
  ServerToClientEvents
} from "../shared/multiplayer";

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface SocketGameController extends GameController {
  roomCode?: string;
  localPlayerId?: PlayerId;
  opponentConnected: boolean;
  status: string;
  error?: string;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
}

export function useSocketGame(): SocketGameController {
  const initialState = useMemo(
    () => createInitialGameState(buildDefaultDeck("P1"), buildDefaultDeck("P2")),
    []
  );
  const socketRef = useRef<GameSocket | undefined>(undefined);
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [roomCode, setRoomCode] = useState<string>();
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId>();
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState<string>();
  const [actionLog, setActionLog] = useState<Array<{ id: number; message: string }>>([
    { id: 1, message: "Socket duel client loaded." }
  ]);

  const socketUrl =
    process.env.NEXT_PUBLIC_SOCKET_URL ||
    "http://127.0.0.1:4000";

  useEffect(() => {
    const socket: GameSocket = io(socketUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setStatus("Connected");
      setError(undefined);
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    socket.on("connect_error", (connectError) => {
      setStatus("Connection failed");
      setError(connectError.message);
    });

    socket.on("game:error", (message) => {
      setError(message);
      addClientLog(message);
    });

    socket.on("room:update", applyRoomUpdate);
    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [socketUrl]);

  const controller = useMemo<SocketGameController>(
    () => ({
      gameState,
      actionLog,
      dispatch,
      dispatchChain,
      resetGame,
      roomCode,
      localPlayerId,
      opponentConnected,
      status,
      error,
      createRoom,
      joinRoom
    }),
    [actionLog, error, gameState, localPlayerId, opponentConnected, roomCode, status]
  );

  return controller;

  function applyRoomUpdate(update: RoomUpdate) {
    setRoomCode(update.roomCode);
    setLocalPlayerId(update.playerId);
    setOpponentConnected(update.opponentConnected);
    setGameState(update.state);
    setActionLog(update.log);
    setStatus(update.opponentConnected ? "Opponent connected" : "Waiting for opponent");
  }

  function createRoom() {
    setError(undefined);
    socketRef.current?.emit("room:create", (response) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
  }

  function joinRoom(inputRoomCode: string) {
    setError(undefined);
    socketRef.current?.emit("room:join", inputRoomCode, (response) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
  }

  function dispatch(action: GameAction): boolean {
    socketRef.current?.emit("game:action", action, (response) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
    return true;
  }

  function dispatchChain(actions: Array<{ action: GameAction }>): boolean {
    for (const { action } of actions) {
      dispatch(action);
    }
    return true;
  }

  function resetGame() {
    socketRef.current?.emit("game:reset", (response) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
  }

  function addClientLog(message: string) {
    setActionLog((current) => [{ id: Date.now() + Math.random(), message }, ...current]);
  }
}
