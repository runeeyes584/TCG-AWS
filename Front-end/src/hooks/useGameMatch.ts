"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameController } from "../components/game/GameBoard";
import { buildDefaultDeck } from "@backend/game/entities/defaultDeck";
import { createInitialGameState } from "@backend/game/core/engine";
import type { GameAction, GameState, PlayerId } from "@backend/game/types";
import type { RoomUpdate } from "@backend/shared/multiplayer";
import { socketManager } from "../libs/socket";

export interface SocketGameController extends GameController {
  roomCode?: string;
  localPlayerId?: PlayerId;
  opponentConnected: boolean;
  status: string;
  error?: string;
  createRoom: () => void;
  joinRoom: (roomCode: string) => void;
  startMatchmaking(): void;
  cancelMatchmaking(): void;
  searching: boolean;
  queueTime: number;
  inGame: boolean;
}

export function useGameMatch(): SocketGameController {
  const initialState = useMemo(
    () => createInitialGameState(buildDefaultDeck("P1"), buildDefaultDeck("P2")),
    []
  );
  
  // States
  const [searching, setSearching] = useState(false);
  const [queueTime, setQueueTime] = useState(0);
  const [inGame, setInGame] = useState(false);
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [roomCode, setRoomCode] = useState<string>();
  const [localPlayerId, setLocalPlayerId] = useState<PlayerId>();
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState<string>();
  const roomCodeRef = useRef<string | undefined>(undefined);
  const [actionLog, setActionLog] = useState<Array<{ id: number; message: string }>>([
    { id: 1, message: "Game match hook loaded." }
  ]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const email = localStorage.getItem("email") || "";

    if (typeof token !== "string" || token.trim().length === 0 || token.split(".").length !== 3) {
      setStatus("Login required");
      setError("Please sign in again before opening Duel.");
      return;
    }

    // 1. Initialize API connection
    const socket = socketManager.connect(token, email);

    // 2. Setup Event Listeners (Handling Server -> Client)
    socket.on("connect", () => {
      setStatus("Connected");
      setError(undefined);
      // Auto-rejoin if room code exists
      if (roomCodeRef.current) {
        socketManager.joinRoom(roomCodeRef.current, (response: any) => {
          if (!response.ok) {
            setError(response.error);
            addClientLog(response.error);
          }
        });
      }
    });

    socket.on("disconnect", () => {
      setStatus("Disconnected");
    });

    socket.on("connect_error", (connectError: any) => {
      setStatus("Connection failed");
      const message = connectError.message === "Unauthorized: missing access token."
          ? "Please sign in again to open Duel."
          : connectError.message;

      if (message !== connectError.message) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      }
      setError(message);
    });

    socket.on("game:error", (message: string) => {
      setError(message);
      addClientLog(message);
    });

    socket.on("room:update", (update: RoomUpdate) => {
      roomCodeRef.current = update.roomCode;
      setRoomCode(update.roomCode);
      setLocalPlayerId(update.playerId);
      setOpponentConnected(update.opponentConnected);
      setGameState(update.state);
      setActionLog(update.log);
      setStatus(update.opponentConnected ? "Opponent connected" : "Waiting for opponent");
    });

    socket.on("matchmaking:searching", () => {
      setSearching(true);
      setStatus("Searching for opponent...");
    });

    socket.on("matchmaking:cancelled", () => {
      setSearching(false);
      setQueueTime(0);
      setStatus("Matchmaking cancelled");
    });

    socket.on("matchmaking:found", () => {
      setSearching(false);
      setQueueTime(0);
      setStatus("Match Found!");
      setInGame(true);
    });

    // Cleanup on unmount
    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("connect_error");
      socket.off("game:error");
      socket.off("room:update");
      socket.off("matchmaking:searching");
      socket.off("matchmaking:cancelled");
      socket.off("matchmaking:found");
      socketManager.disconnect();
    };
    }, []);

  // Queue Timer
  useEffect(() => {
    if (!searching) return;
    const timer = setInterval(() => setQueueTime((t) => t + 1), 1000);
    return () => clearInterval(timer);
  }, [searching]);

  // --- Handlers (Client -> Server via API layer) ---
  function addClientLog(message: string) {
    setActionLog((current) => [{ id: Date.now() + Math.random(), message }, ...current]);
  }

  function createRoom() {
    setError(undefined);
    socketManager.createRoom((response: any) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
        return;
      }

      roomCodeRef.current = response.roomCode;
      setRoomCode(response.roomCode);
      setLocalPlayerId(response.playerId);
      setOpponentConnected(false);
      setStatus(`Room ${response.roomCode} created. Waiting for opponent`);
    });
  }

  function joinRoom(inputRoomCode: string) {
    setError(undefined);
    const normalizedRoomCode = inputRoomCode.trim().toUpperCase();

    if (!normalizedRoomCode) {
      setError("Enter a room code.");
      return;
    }

    socketManager.joinRoom(normalizedRoomCode, (response: any) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
        return;
      }

      roomCodeRef.current = response.roomCode;
      setRoomCode(response.roomCode);
      setLocalPlayerId(response.playerId);
    });
  }

  function dispatch(action: GameAction): boolean {
    socketManager.dispatchAction(action, (response: any) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
    return true;
  }

  function dispatchChain(actions: Array<{ action: GameAction }>): boolean {
    actions.forEach(({ action }) => dispatch(action));
    return true;
  }

  function resetGame() {
    socketManager.resetGame((response: any) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
  }

  function startMatchmaking() {
    setError(undefined);
    socketManager.startMatchmaking();
  }

  function cancelMatchmaking() {
    socketManager.cancelMatchmaking();
    setSearching(false);
    setQueueTime(0);
  }

  // Return the controller object
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
      joinRoom,
      searching,
      queueTime,
      startMatchmaking,
      cancelMatchmaking,
      inGame
    }),
    [actionLog, error, gameState, localPlayerId, opponentConnected, roomCode, status, searching, queueTime, inGame]
  );

  return controller;
}
