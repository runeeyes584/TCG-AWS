"use client";

import { useEffect, useRef, useState, memo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Clipboard,
  Flame,
  Link,
  Loader2,
  Radio,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { GameBoardView } from "../game/GameBoard";
import { PhaserSplash } from "./PhaserSplash";
import { PendingMatchDialog } from "./PendingMatchDialog";
import { CyberCodeSlotInput } from "../matchmaking/CyberCodeSlotInput";
import {
  MatchFoundShowcase,
  type ShowcasePlayer,
} from "../matchmaking/MatchFoundShowcase";
import { useGameMatch } from "../../hooks/useGameMatch";
import {
  cancelPendingMatchmaking,
  forfeitPendingMatch,
  getPendingMatch,
  listDecks,
  me,
  type PendingMatch,
  type PlayerProfile,
} from "../../libs/api";
import {
  getDefaultLocalDeck,
  getSelectedDeckId,
  loadLocalDecks,
  mergeCloudDecks,
  type LocalDeck,
} from "../../libs/localDecks";
import {
  getCachedPendingMatch,
  setCachedPendingMatch,
  getCachedProfile,
  setCachedProfile,
} from "../../libs/profileCache";

type PrivateRoomMode = "create" | "join";

export function PrivateRoomScreen(props: {
  mode: PrivateRoomMode;
  initialRoomCode?: string;
}) {
  const router = useRouter();
  const normalizedInitialCode = props.initialRoomCode?.trim().toUpperCase();
  const initialValidCode =
    normalizedInitialCode && /^[A-HJ-NP-Z2-9]{6}$/.test(normalizedInitialCode)
      ? normalizedInitialCode
      : undefined;

  const [inputCode, setInputCode] = useState<string>(initialValidCode || "");
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isHoveredCta, setIsHoveredCta] = useState(false);

  const controller = useGameMatch();
  const createRequestedRef = useRef(false);
  const joinRequestedRef = useRef(false);

  const [showcaseCompleted, setShowcaseCompleted] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | undefined>(() => {
    const cached = getCachedProfile();
    return cached ? (cached as PlayerProfile) : undefined;
  });

  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(() => {
    const cached = getCachedPendingMatch();
    return cached ? cached.match : null;
  });
  const [pendingMatchError, setPendingMatchError] = useState<string>();
  const [pendingMatchChecked, setPendingMatchChecked] = useState(() => {
    return getCachedPendingMatch() !== null;
  });
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);
  const [continuingPendingMatch, setContinuingPendingMatch] = useState(false);

  // Load selected deck from local storage / cloud for custom match payload
  const [selectedDeck, setSelectedDeck] = useState<LocalDeck>(() => {
    const decks = loadLocalDecks();
    const selectedId = getSelectedDeckId();
    return decks.find((deck) => deck.deckId === selectedId) ?? decks[0] ?? getDefaultLocalDeck();
  });
  const [leavingRoom, setLeavingRoom] = useState(false);

  // Sync cloud decks once in the background for accurate create/join payloads.
  useEffect(() => {
    let mounted = true;
    void listDecks()
      .then((result) => {
        if (!mounted) return;
        const decks = mergeCloudDecks(result.decks);
        const selected = decks.find((deck) => deck.deckId === getSelectedDeckId()) ?? decks[0];
        setSelectedDeck(selected);
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  // AuthGuard hydrates the profile cache before this screen mounts. Only
  // request the profile here when a direct mount has no cached profile.
  useEffect(() => {
    if (profile) return;
    let mounted = true;
    void me()
      .then(({ user }) => {
        if (mounted && user) {
          setProfile(user);
          setCachedProfile(user);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [profile]);

  // Check pending match
  useEffect(() => {
    let mounted = true;
    void getPendingMatch()
      .then((result) => {
        if (mounted) {
          setPendingMatch(result.match);
          setCachedPendingMatch(result.match);
          setPendingMatchError(undefined);
        }
      })
      .catch((error) => {
        if (mounted) {
          setPendingMatchError(
            error instanceof Error ? error.message : "Unable to check your active match."
          );
        }
      })
      .finally(() => {
        if (mounted) setPendingMatchChecked(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!controller.resumeRequired) return;
    setPendingMatch(controller.resumeRequired);
    setPendingMatchChecked(true);
  }, [controller.resumeRequired]);

  useEffect(() => {
    if (controller.error) {
      createRequestedRef.current = false;
      joinRequestedRef.current = false;
    }
  }, [controller.error]);

  // Host Mode: Auto create room once connected
  useEffect(() => {
    if (
      props.mode !== "create" ||
      controller.roomCode ||
      createRequestedRef.current ||
      Boolean(pendingMatch) ||
      controller.status !== "Connected"
    ) {
      return;
    }
    createRequestedRef.current = true;
    controller.createRoom({ deckId: selectedDeck.deckId, cardIds: selectedDeck.cardIds });
  }, [controller.status, controller.roomCode, pendingMatch, props.mode, selectedDeck]);

  // Guest Mode: If initial code is supplied and valid, auto join
  useEffect(() => {
    if (
      props.mode !== "join" ||
      joinRequestedRef.current ||
      Boolean(pendingMatch) ||
      !initialValidCode ||
      controller.status !== "Connected"
    ) {
      return;
    }
    joinRequestedRef.current = true;
    controller.joinRoom(initialValidCode, {
      deckId: selectedDeck.deckId,
      cardIds: selectedDeck.cardIds,
    });
  }, [controller.status, pendingMatch, props.mode, selectedDeck, initialValidCode]);

  // Once in game, render 5-second Cyborg Versus showcase first, then game board
  if (
    (controller.inGame || Boolean(controller.gameState.started) || Boolean(controller.gameState.winnerId)) &&
    controller.roomCode &&
    controller.localPlayerId
  ) {
    const localId = controller.localPlayerId;
    const oppId = localId === "P1" ? "P2" : "P1";
    const isNewGame =
      !controller.gameState.winnerId &&
      (controller.gameState.turn ?? 1) <= 1 &&
      (controller.gameState.round ?? 1) <= 1;

    if (!showcaseCompleted && isNewGame) {
      const localProfile = controller.playerProfiles?.[localId];
      const oppProfile = controller.playerProfiles?.[oppId];

      const localShowcase: ShowcasePlayer = {
        username:
          localProfile?.username ??
          profile?.username ??
          (localId === "P1" ? "Host Operative" : "Guest Operative"),
        avatar: localProfile?.avatar ?? profile?.avatar,
        elo: localProfile?.elo ?? profile?.elo ?? 1200,
        title: "Prism Vanguard",
      };

      const oppShowcase: ShowcasePlayer = {
        username:
          oppProfile?.username ?? (localId === "P1" ? "Guest Operative" : "Host Operative"),
        avatar: oppProfile?.avatar,
        elo: oppProfile?.elo ?? (profile?.elo ? profile.elo + 25 : 1225),
        title: "Nexus Contender",
      };

      return (
        <MatchFoundShowcase
          localPlayer={localShowcase}
          opponent={oppShowcase}
          onComplete={() => setShowcaseCompleted(true)}
          durationSeconds={5}
        />
      );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        style={{ width: "100%", height: "100%" }}
      >
        <GameBoardView
          controller={controller}
          localPlayerId={controller.localPlayerId}
          opponentConnected={controller.opponentConnected}
          connectionStatus={`${controller.status} · Room ${controller.roomCode}`}
        />
      </motion.div>
    );
  }

  const roomCode = controller.roomCode || (props.mode === "join" ? inputCode : undefined);
  const isValidGuestCode = /^[A-HJ-NP-Z2-9]{6}$/.test(inputCode);

  const handleCodeAutoJoin = (code: string) => {
    if (props.mode !== "join" || controller.roomCode || controller.status !== "Connected") return;
    const cleanCode = code.trim().toUpperCase();
    if (/^[A-HJ-NP-Z2-9]{6}$/.test(cleanCode)) {
      joinRequestedRef.current = true;
      controller.joinRoom(cleanCode, {
        deckId: selectedDeck.deckId,
        cardIds: selectedDeck.cardIds,
      });
    }
  };

  const handleJoinClick = () => {
    if (!isValidGuestCode || controller.status !== "Connected") return;
    joinRequestedRef.current = true;
    controller.joinRoom(inputCode.trim().toUpperCase(), {
      deckId: selectedDeck.deckId,
      cardIds: selectedDeck.cardIds,
    });
  };

  const leaveRoom = async () => {
    if (leavingRoom || controller.inGame) return;
    setLeavingRoom(true);
    setPendingMatchError(undefined);

    controller.cancelMatchmaking();
    try {
      await cancelWaitingRoomWithRetry();
      router.replace("/");
    } catch (error) {
      setPendingMatchError(
        error instanceof Error ? error.message : "Unable to leave the waiting room. Please retry."
      );
      setLeavingRoom(false);
    }
  };

  async function cancelWaitingRoomWithRetry(): Promise<void> {
    let lastError: unknown;
    for (const delay of [0, 200, 500]) {
      if (delay) await new Promise<void>((resolve) => window.setTimeout(resolve, delay));
      try {
        await cancelPendingMatchmaking();
        return;
      } catch (error) {
        lastError = error;
        if (!(error instanceof Error) || !/No waiting room was found/i.test(error.message)) throw error;
      }
    }
    if (lastError instanceof Error && /No waiting room was found/i.test(lastError.message)) return;
    throw lastError instanceof Error ? lastError : new Error("Unable to cancel the waiting room.");
  }

  const resumePendingMatch = () => {
    if (pendingMatch) {
      setContinuingPendingMatch(true);
      window.requestAnimationFrame(() => {
        window.location.assign(`/play?room=${encodeURIComponent(pendingMatch.roomCode)}&resume=1`);
      });
    }
  };

  const abandonPendingMatch = async () => {
    setResolvingPendingMatch(true);
    setPendingMatchError(undefined);
    try {
      await forfeitPendingMatch();
      setPendingMatch(null);
      setCachedPendingMatch(null);
    } catch (error) {
      setPendingMatchError(error instanceof Error ? error.message : "Unable to leave the active match.");
    } finally {
      setResolvingPendingMatch(false);
    }
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const copyRoomLink = async () => {
    if (!roomCode || typeof window === "undefined") return;
    const link = `${window.location.origin}/room-join?room=${encodeURIComponent(roomCode)}`;
    await navigator.clipboard.writeText(link);
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <main className="matchmaking-shell private-room-shell">
      <div className="matchmaking-grid" aria-hidden="true" />
      <div className="matchmaking-art" aria-hidden="true">
        <PhaserSplash />
      </div>
      <div className="matchmaking-shade" aria-hidden="true" />

      {/* Header Bar */}
      <header className="matchmaking-header">
        <button
          type="button"
          className="matchmaking-back"
          onClick={leaveRoom}
          aria-label="Return to lobby"
          disabled={leavingRoom}
        >
          <ArrowLeft size={16} />
          <span>Lobby</span>
        </button>
        <div className="matchmaking-title">
          <span>CHRONO GENESIS TCG</span>
          <small>PRIVATE CIRCUIT // CUSTOM DUEL</small>
        </div>
        <div aria-hidden="true" />
      </header>

      {/* Left-Aligned Tactical Content Area */}
      <section className="matchmaking-content private-room-content-compact">
        <motion.div
          className="matchmaking-kicker"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Users size={14} /> PRIVATE FREQUENCY // 1V1 TACTICAL ARENA
        </motion.div>

        <motion.h1
          className="matchmaking-heading-compact"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          {props.mode === "create" ? (
            <>
              HOST PRIVATE <em>DUEL</em>
            </>
          ) : (
            <>
              JOIN PRIVATE <em>DUEL</em>
            </>
          )}
        </motion.h1>

        <motion.p
          className="matchmaking-lede"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          style={{ marginBottom: "18px" }}
        >
          {props.mode === "create"
            ? "Share your 6-character frequency code below. The arena activates as soon as your opponent synchronizes."
            : "Enter or paste the 6-character frequency code to synchronize with the host's tactical arena."}
        </motion.p>

        {/* Focused Cyber Terminal Action Card */}
        <div className="private-room-module-card">
          {props.mode === "create" ? (
            /* HOST MODE */
            <motion.div
              className="private-room-host-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <div className="card-hazard-line" aria-hidden="true" />
              <div className="card-corner top-left" aria-hidden="true" />
              <div className="card-corner top-right" aria-hidden="true" />
              <div className="card-corner bottom-left" aria-hidden="true" />
              <div className="card-corner bottom-right" aria-hidden="true" />

              <div className="private-room-header-telemetry">
                <span className="private-room-telemetry-tag">
                  <ShieldCheck size={15} className="text-cyan" />
                  AUTHENTICATED HOST CIRCUIT
                </span>
                <span
                  className={`private-room-telemetry-badge ${
                    controller.opponentConnected ? "is-connected" : "is-waiting"
                  }`}
                >
                  {controller.opponentConnected ? "OPPONENT DETECTED" : "AWAITING GUEST LINK"}
                </span>
              </div>

              {/* 6 Large Character Slots for Host Code */}
              <div className="host-code-slots-row">
                {Array.from({ length: 6 }).map((_, idx) => {
                  const char = roomCode ? roomCode[idx] : "·";
                  return (
                    <div key={idx} className="host-code-slot">
                      <div className="slot-corner top-left" />
                      <div className="slot-corner top-right" />
                      <div className="slot-corner bottom-left" />
                      <div className="slot-corner bottom-right" />
                      <span>{char}</span>
                    </div>
                  );
                })}
              </div>

              {/* Radar pulse scanner bar */}
              <div
                className={`radar-pulse-scanner-bar ${
                  controller.opponentConnected ? "is-opponent-joined" : ""
                }`}
              >
                {!controller.opponentConnected && <div className="radar-sweep-beam" />}
                {controller.opponentConnected ? (
                  <Check size={16} className="radar-check-icon text-emerald-400" />
                ) : (
                  <Loader2 size={16} className="radar-loading-icon text-amber-400 animate-spin" />
                )}
                <span
                  className={`radar-status-text ${
                    controller.opponentConnected ? "is-connected" : "is-waiting"
                  }`}
                >
                  {controller.opponentConnected
                    ? "Opponent has been join. Ready for battle"
                    : "Waiting for opponent join"}
                </span>
              </div>

              {controller.error ? <p className="matchmaking-error">{controller.error}</p> : null}
              {pendingMatchError ? (
                <p className="pending-match-check-error" role="alert">
                  {pendingMatchError}
                </p>
              ) : null}

              {/* Quick Actions Grid (COPY ROOM CODE & ABORT/LEAVE ROOM on 1 row) */}
              <div className="private-room-actions-grid" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className={`btn-cyber-action ${copiedCode ? "is-success" : ""}`}
                  onClick={copyRoomCode}
                  disabled={!roomCode}
                >
                  {copiedCode ? <Check size={16} /> : <Clipboard size={16} />}
                  <span>{copiedCode ? "CODE COPIED!" : "COPY ROOM CODE"}</span>
                </button>

                <button
                  type="button"
                  className="btn-cyber-action btn-leave-room"
                  onClick={leaveRoom}
                  disabled={leavingRoom}
                >
                  <X size={16} />
                  <span>{leavingRoom ? "TERMINATING CIRCUIT..." : "ABORT / LEAVE ROOM"}</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* GUEST MODE */
            <motion.div
              className="private-room-guest-panel"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              {/* Interactive 6-Slot Cyber Code Input with Paste & Verify */}
              <CyberCodeSlotInput
                value={inputCode}
                onChange={(code) => {
                  setInputCode(code);
                  if (controller.error) {
                    joinRequestedRef.current = false;
                  }
                }}
                onComplete={handleCodeAutoJoin}
                disabled={Boolean(controller.roomCode)}
                hasError={Boolean(controller.error)}
                errorMessage={controller.error}
                isJoined={Boolean(controller.roomCode)}
              />

              {pendingMatchError ? (
                <p className="pending-match-check-error" role="alert">
                  {pendingMatchError}
                </p>
              ) : null}

              {/* Guest Return to Lobby Action */}
              <div style={{ marginTop: "4px", width: "100%" }}>
                <button
                  type="button"
                  className="btn-cyber-action btn-leave-room"
                  onClick={leaveRoom}
                  disabled={leavingRoom}
                  style={{ width: "100%" }}
                >
                  <ArrowLeft size={16} />
                  <span>{leavingRoom ? "RETURNING..." : "RETURN TO LOBBY"}</span>
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Pending Match Dialog if user has an existing match */}
        {pendingMatch ? (
          <PendingMatchDialog
            status={pendingMatch.status}
            isResolving={resolvingPendingMatch}
            isContinuing={continuingPendingMatch}
            onContinue={resumePendingMatch}
            onForfeit={abandonPendingMatch}
          />
        ) : null}
      </section>
    </main>
  );
}
