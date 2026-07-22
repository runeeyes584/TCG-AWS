"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GameController } from "../components/game/GameBoard";
import { buildDefaultDeck } from "@backend/game/entities/defaultDeck";
import { createInitialGameState } from "@backend/game/core/engine";
import type { GameAction, GameState, PlayerId } from "@backend/game/types";
import type { DeveloperResourceUpdate, MatchmakingDeckSelection, RoomUpdate } from "@backend/shared/multiplayer";
import { accessTokenNeedsRefresh, refreshToken } from "../libs/api";
import { socketManager } from "../libs/socket";
import { getSelectedDeckId, loadLocalDecks } from "../libs/localDecks";

export interface SocketGameController extends GameController {
  roomCode?: string;
  localPlayerId?: PlayerId;
  opponentConnected: boolean;
  status: string;
  error?: string;
  resumeRequired?: {
    roomCode: string;
    status: "IN_PROGRESS";
    playerId?: PlayerId;
    opponentConnected?: boolean;
  };
  createRoom: (selection?: MatchmakingDeckSelection) => void;
  joinRoom: (roomCode: string, selection?: MatchmakingDeckSelection) => void;
  startMatchmaking(selection?: MatchmakingDeckSelection): void;
  cancelMatchmaking(): void;
  searching: boolean;
  queueTime: number;
  inGame: boolean;
}

export function useGameMatch(resumeRoomCode?: string): SocketGameController {
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
  const [playerProfiles, setPlayerProfiles] = useState<RoomUpdate["players"]>({});
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [status, setStatus] = useState("Disconnected");
  const [error, setError] = useState<string>();
  const [resumeRequired, setResumeRequired] = useState<SocketGameController["resumeRequired"]>();
  const roomCodeRef = useRef<string | undefined>(resumeRoomCode);
  const [actionLog, setActionLog] = useState<Array<{ id: number; message: string }>>([
    { id: 1, message: "Game match hook loaded." }
  ]);

  useEffect(() => {
    let active = true;
    let socket: ReturnType<typeof socketManager.connect> | undefined;
    let refreshRetried = false;
    const email = localStorage.getItem("email") || "";

    const clearAuthentication = (message: string) => {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setStatus("Login required");
      setSearching(false);
      setQueueTime(0);
      setError(message);
    };

    const refreshAccessToken = async () => {
      const result = await refreshToken();
      if (!result.accessToken || result.accessToken.split(".").length !== 3) {
        throw new Error("Refresh did not return a valid access token.");
      }
      localStorage.setItem("accessToken", result.accessToken);
      return result.accessToken;
    };

    const isRefreshableAuthError = (message: string) =>
      /exp.*timestamp check failed|token expired|jwt expired|invalid access token/i.test(message);

    const initializeSocket = async () => {
      let token = localStorage.getItem("accessToken");
      if (typeof token !== "string" || token.trim().length === 0 || token.split(".").length !== 3) {
        clearAuthentication("Please sign in again before opening Duel.");
        return;
      }

      try {
        if (accessTokenNeedsRefresh(token)) {
          token = await refreshAccessToken();
        }
      } catch {
        if (active) {
          clearAuthentication("Your session has expired. Please sign in again before opening Duel.");
        }
        return;
      }

      if (!active) {
        return;
      }

      socket = socketManager.connect(token, email);

      socket.on("connect", () => {
      refreshRetried = false;
      setStatus("Connected");
      setError(undefined);
      // A room code from the URL is an explicit private-room join (or resume).
      // Codes learned later from the server use the generic resume handshake.
      if (resumeRoomCode) {
        roomCodeRef.current = resumeRoomCode.trim().toUpperCase();
        socketManager.resumeMatch();
      } else if (roomCodeRef.current) {
        const knownRoomCode = roomCodeRef.current;
        if (/^[A-HJ-NP-Z2-9]{6}$/.test(knownRoomCode)) {
          socketManager.joinRoom(knownRoomCode, getLocalDeckSelection(), (response) => {
            if (!response.ok) setError(response.error);
          });
        } else {
          socketManager.startMatchmaking(getLocalDeckSelection());
        }
      }
      });

      socket.on("disconnect", () => {
      setStatus("Disconnected");
      setSearching(false);
      setQueueTime(0);
      });

      socket.on("connect_error", (connectError: { message?: string }) => {
        const message = connectError.message || "Unable to connect to the game server.";
        const storedToken = localStorage.getItem("accessToken");
        const tokenNeedsRefresh = !storedToken || accessTokenNeedsRefresh(storedToken);
        if ((isRefreshableAuthError(message) || tokenNeedsRefresh) && !refreshRetried) {
          refreshRetried = true;
          setStatus("Refreshing session");
          void refreshAccessToken()
            .then((nextToken) => {
              if (active) {
                socketManager.connect(nextToken, email);
              }
            })
            .catch(() => {
              if (active) {
                clearAuthentication("Your session has expired. Please sign in again to play.");
              }
            });
          return;
        }

        setStatus("Connection failed");
        setSearching(false);
        setQueueTime(0);
        setError(
          message === "Unauthorized: missing access token."
            ? "Please sign in again to open Duel."
            : message
        );
      });

      socket.on("game:error", (message: string) => {
      setError(message);
      addClientLog(message);
      });

      socket.on("match:resume_required", (message?: SocketGameController["resumeRequired"]) => {
      if (!message?.roomCode) return;
      setSearching(false);
      setQueueTime(0);
      setResumeRequired(message);
      setStatus("Match recovery required");
      });

      socket.on("room:update", (update: Partial<RoomUpdate> & Pick<RoomUpdate, "playerId" | "state">) => {
      const nextRoomCode = update.roomCode ?? roomCodeRef.current;
      roomCodeRef.current = nextRoomCode;
      setRoomCode(nextRoomCode);
      setLocalPlayerId(update.playerId);
      setOpponentConnected(update.opponentConnected ?? true);
      if (update.players) setPlayerProfiles(update.players);
      setGameState(update.state);
      if (update.log) setActionLog(update.log);
      setStatus(update.opponentConnected === false ? "Waiting for opponent" : "Opponent connected");
      });

      socket.on("room:created", (message?: {
        roomCode?: string;
        playerId?: PlayerId;
        state?: GameState;
        opponentConnected?: boolean;
      }) => {
      if (!message?.roomCode) {
        setError("The game server did not return a room code.");
        return;
      }
      roomCodeRef.current = message.roomCode;
      setRoomCode(message.roomCode);
      setLocalPlayerId(message.playerId ?? "P1");
      if (message.state) setGameState(message.state);
      setOpponentConnected(message.opponentConnected ?? false);
      setSearching(false);
      setQueueTime(0);
      setInGame(false);
      setStatus(`Room ${message.roomCode} created. Waiting for opponent`);
      });

      socket.on("matchmaking:searching", (message?: { roomCode?: string }) => {
      if (message?.roomCode) {
        roomCodeRef.current = message.roomCode;
        setRoomCode(message.roomCode);
      }
      setSearching(true);
      setStatus("Searching for opponent...");
      });

      socket.on("matchmaking:cancelled", () => {
      setSearching(false);
      setQueueTime(0);
      setStatus("Matchmaking cancelled");
      });

      socket.on("matchmaking:found", (message?: { roomCode?: string; playerId?: PlayerId; state?: GameState }) => {
      if (message?.roomCode) {
        roomCodeRef.current = message.roomCode;
        setRoomCode(message.roomCode);
      }
      if (message?.playerId) setLocalPlayerId(message.playerId);
      if (message?.state) setGameState(message.state);
      setOpponentConnected(true);
      setSearching(false);
      setQueueTime(0);
      setStatus("Match Found!");
      setInGame(true);
      });

      socket.on("match:ended", (message?: { state?: GameState }) => {
      if (message?.state) setGameState(message.state);
      setSearching(false);
      setInGame(false);
      setStatus("Match ended");
      });
    };

    void initializeSocket();

    return () => {
      active = false;
      socket?.off("connect");
      socket?.off("disconnect");
      socket?.off("connect_error");
      socket?.off("game:error");
      socket?.off("match:resume_required");
      socket?.off("room:update");
      socket?.off("room:created");
      socket?.off("matchmaking:searching");
      socket?.off("matchmaking:cancelled");
      socket?.off("matchmaking:found");
      socket?.off("match:ended");
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

  function createRoom(selection?: MatchmakingDeckSelection) {
    setError(undefined);
    if (!socketManager.getSocket()?.connected) {
      setError("Connecting to the game server. Please try again in a moment.");
      return;
    }
    setStatus("Creating private room...");
    socketManager.createRoom(selection ?? getLocalDeckSelection(), (response) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
  }

  function joinRoom(inputRoomCode: string, selection?: MatchmakingDeckSelection) {
    setError(undefined);
    const normalizedRoomCode = inputRoomCode.trim().toUpperCase();

    if (!normalizedRoomCode) {
      setError("Enter a room code.");
      return;
    }

    if (!socketManager.getSocket()?.connected) {
      setError("Connecting to the game server. Please try again in a moment.");
      return;
    }

    setStatus(`Joining room ${normalizedRoomCode}...`);
    socketManager.joinRoom(normalizedRoomCode, selection ?? getLocalDeckSelection(), (response) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
  }

  function dispatch(action: GameAction): boolean {
    socketManager.dispatchAction(roomCodeRef.current, action, (response: any) => {
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

  function startMatchmaking(selection?: MatchmakingDeckSelection) {
    if (!socketManager.getSocket()?.connected) {
      setError("Connecting to the game server. Please try again in a moment.");
      return;
    }

    setError(undefined);
    setQueueTime(0);
    setSearching(true);
    socketManager.startMatchmaking(selection);
  }

  function setDeveloperResources(updates: DeveloperResourceUpdate[]) {
    socketManager.updateDeveloperResources(updates, (response: any) => {
      if (!response.ok) {
        setError(response.error);
        addClientLog(response.error);
      }
    });
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
      setDeveloperResources,
      roomCode,
      localPlayerId,
      playerProfiles,
      opponentConnected,
      status,
      error,
      resumeRequired,
      createRoom,
      joinRoom,
      searching,
      queueTime,
      startMatchmaking,
      cancelMatchmaking,
      inGame
    }),
    [actionLog, error, gameState, localPlayerId, playerProfiles, opponentConnected, roomCode, status, searching, queueTime, inGame, resumeRequired]
  );

  return controller;
}

function getLocalDeckSelection(): MatchmakingDeckSelection | undefined {
  const decks = loadLocalDecks();
  const selectedDeckId = getSelectedDeckId();
  const selectedDeck = decks.find((deck) => deck.deckId === selectedDeckId) ?? decks[0];
  return selectedDeck
    ? { deckId: selectedDeck.deckId, cardIds: selectedDeck.cardIds }
    : undefined;
}
