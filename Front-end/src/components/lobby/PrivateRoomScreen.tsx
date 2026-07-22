"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clipboard, Hash, Radio, ShieldCheck, Users, X } from "lucide-react";
import { GameBoardView } from "../game/GameBoard";
import { PhaserSplash } from "./PhaserSplash";
import { PendingMatchDialog, PendingMatchLoadingGate } from "./PendingMatchDialog";
import { useGameMatch } from "../../hooks/useGameMatch";
import {
  cancelPendingMatchmaking,
  forfeitPendingMatch,
  getPendingMatch,
  listDecks,
  type PendingMatch
} from "../../libs/api";
import {
  getDefaultLocalDeck,
  getSelectedDeckId,
  mergeCloudDecks,
  type LocalDeck
} from "../../libs/localDecks";

type PrivateRoomMode = "create" | "join";

export function PrivateRoomScreen(props: {
  mode: PrivateRoomMode;
  initialRoomCode?: string;
}) {
  const router = useRouter();
  const normalizedRoomCode = props.initialRoomCode?.trim().toUpperCase();
  const validJoinCode = normalizedRoomCode && /^[A-HJ-NP-Z2-9]{6}$/.test(normalizedRoomCode)
    ? normalizedRoomCode
    : undefined;
  // A room code is a request to join a private room, never a resume token.
  // Only /play?room=...&resume=1 may call the explicit resume handshake.
  const controller = useGameMatch();
  const createRequestedRef = useRef(false);
  const joinRequestedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [pendingMatchError, setPendingMatchError] = useState<string>();
  const [pendingMatchChecked, setPendingMatchChecked] = useState(false);
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);
  const [selectedDeck, setSelectedDeck] = useState<LocalDeck>(getDefaultLocalDeck);
  const [deckSelectionReady, setDeckSelectionReady] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);

  useEffect(() => {
    let mounted = true;
    void listDecks()
      .then((result) => {
        if (!mounted) return;
        const decks = mergeCloudDecks(result.decks);
        const selected = decks.find((deck) => deck.deckId === getSelectedDeckId()) ?? decks[0];
        setSelectedDeck(selected);
      })
      .catch(() => {
        if (mounted) setSelectedDeck(getDefaultLocalDeck());
      })
      .finally(() => {
        if (mounted) setDeckSelectionReady(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    void getPendingMatch()
      .then((result) => {
        if (mounted) {
          setPendingMatch(result.match);
          setPendingMatchError(undefined);
        }
      })
      .catch((error) => {
        if (mounted) {
          setPendingMatchError(error instanceof Error ? error.message : "Unable to check your active match.");
        }
      })
      .finally(() => {
        if (mounted) setPendingMatchChecked(true);
      });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!controller.resumeRequired) return;
    setPendingMatch(controller.resumeRequired);
    setPendingMatchChecked(true);
  }, [controller.resumeRequired]);

  useEffect(() => {
    if (
      props.mode !== "create" ||
      createRequestedRef.current ||
      !pendingMatchChecked ||
      Boolean(pendingMatch) ||
      !deckSelectionReady ||
      controller.status !== "Connected"
    ) {
      return;
    }
    createRequestedRef.current = true;
    controller.createRoom({ deckId: selectedDeck.deckId, cardIds: selectedDeck.cardIds });
  }, [controller, deckSelectionReady, pendingMatch, pendingMatchChecked, props.mode, selectedDeck]);

  useEffect(() => {
    if (
      props.mode !== "join" ||
      joinRequestedRef.current ||
      !pendingMatchChecked ||
      Boolean(pendingMatch) ||
      !deckSelectionReady ||
      !validJoinCode ||
      controller.status !== "Connected"
    ) {
      return;
    }
    joinRequestedRef.current = true;
    controller.joinRoom(validJoinCode, { deckId: selectedDeck.deckId, cardIds: selectedDeck.cardIds });
  }, [controller, deckSelectionReady, pendingMatch, pendingMatchChecked, props.mode, selectedDeck, validJoinCode]);

  if (controller.inGame && controller.roomCode && controller.localPlayerId) {
    return (
      <GameBoardView
        controller={controller}
        localPlayerId={controller.localPlayerId}
        opponentConnected={controller.opponentConnected}
        connectionStatus={`${controller.status} · Room ${controller.roomCode}`}
      />
    );
  }

  const roomCode = controller.roomCode || validJoinCode;
  const invalidJoinCode = props.mode === "join" && !validJoinCode;

  const leaveRoom = async () => {
    if (leavingRoom || controller.inGame) return;
    setLeavingRoom(true);
    setPendingMatchError(undefined);

    // Keep the socket request for the normal fast path, but wait for the HTTP
    // transaction before unmounting. WebSocket.send has no server ACK and the
    // old implementation closed the socket before cancellation could reach AWS.
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
        // room-create can still be completing its DynamoDB write on the first
        // cancellation attempt; retry only the explicit "not found" result.
        if (!(error instanceof Error) || !/No waiting room was found/i.test(error.message)) throw error;
      }
    }
    // DELETE/cancel is idempotent. A 404 after the retries means that the
    // opponent, timeout cleanup or disconnect cleanup already removed it;
    // leaving the room must still return the player to the lobby.
    if (lastError instanceof Error && /No waiting room was found/i.test(lastError.message)) return;
    throw lastError instanceof Error ? lastError : new Error("Unable to cancel the waiting room.");
  }

  const resumePendingMatch = () => {
    if (pendingMatch) {
      window.location.assign(`/play?room=${encodeURIComponent(pendingMatch.roomCode)}&resume=1`);
    }
  };

  const abandonPendingMatch = async () => {
    setResolvingPendingMatch(true);
    setPendingMatchError(undefined);
    try {
      await forfeitPendingMatch();
      setPendingMatch(null);
    } catch (error) {
      setPendingMatchError(error instanceof Error ? error.message : "Unable to leave the active match.");
    } finally {
      setResolvingPendingMatch(false);
    }
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="matchmaking-shell private-room-shell">
      <div className="matchmaking-grid" aria-hidden="true" />
      <div className="matchmaking-art" aria-hidden="true"><PhaserSplash /></div>
      <div className="matchmaking-shade" aria-hidden="true" />

      <header className="matchmaking-header">
        <button className="matchmaking-back" onClick={leaveRoom} aria-label="Return to lobby">
          <ArrowLeft size={18} />
          <span>Lobby</span>
        </button>
        <div className="matchmaking-title"><span>KALEIDOSCOPE</span><small>PRIVATE CIRCUIT</small></div>
        <span className="private-room-connection"><Radio size={15} /> {controller.status}</span>
      </header>

      <section className="matchmaking-content">
        <div className="matchmaking-kicker"><Users size={15} /> Friendly duel</div>
        <h1>{props.mode === "create" ? <>Invite a <em>friend</em></> : <>Joining private <em>room</em></>}</h1>
        <p className="matchmaking-lede">
          {props.mode === "create"
            ? "Share the room code below. The duel starts only after your friend joins."
            : `Connecting to private room ${validJoinCode || ""}.`}
        </p>

        <section className="matchmaking-console private-room-console" aria-live="polite">
          <div className="matchmaking-console__top">
            <div className="matchmaking-player">
              <div className="matchmaking-avatar"><Hash size={25} /></div>
              <div>
                <strong>{props.mode === "create" ? "Private room host" : "Private room guest"}</strong>
                <span><ShieldCheck size={13} /> Authenticated WebSocket</span>
              </div>
            </div>
          </div>

          <div className="private-room-code-panel">
            <small>Room code</small>
            <strong>{roomCode || (invalidJoinCode ? "INVALID" : "······")}</strong>
            <span>
              {invalidJoinCode
                ? "The room link is invalid. Return to the lobby and enter a six-character code."
                : controller.opponentConnected
                  ? "Opponent connected. Preparing the duel..."
                  : controller.status}
            </span>
          </div>

          {controller.error ? <p className="matchmaking-error">{controller.error}</p> : null}
          {pendingMatchError ? <p className="pending-match-check-error" role="alert">{pendingMatchError}</p> : null}

          {props.mode === "create" && roomCode ? (
            <button className="matchmaking-command" onClick={copyRoomCode}>
              {copied ? <Check size={19} /> : <Clipboard size={19} />}
              {copied ? "Code copied" : "Copy room code"}
            </button>
          ) : null}
          <button className="matchmaking-command matchmaking-command--cancel" onClick={leaveRoom} disabled={leavingRoom}>
            <X size={19} /> {leavingRoom ? "Leaving..." : "Leave room"}
          </button>
        </section>
      </section>
      {!pendingMatchChecked ? <PendingMatchLoadingGate /> : null}
      {pendingMatch ? (
        <PendingMatchDialog
          status={pendingMatch.status}
          isResolving={resolvingPendingMatch}
          onContinue={resumePendingMatch}
          onForfeit={abandonPendingMatch}
        />
      ) : null}
    </main>
  );
}
