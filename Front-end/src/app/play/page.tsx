"use client";

import { motion } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CircleDotDashed,
  Headphones,
  Radio,
  Search,
  ShieldCheck,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { GameBoardView } from "../../components/game/GameBoard";
import { PhaserSplash } from "../../components/lobby/PhaserSplash";
import { PendingMatchDialog } from "../../components/lobby/PendingMatchDialog";
import { DeckSelectionPanel } from "../../components/deck/DeckSelectionPanel";
import { useGameMatch } from "../../hooks/useGameMatch";
import { useLocalGame } from "../../hooks/useLocalGame";
import { useLoopingAudio } from "../../hooks/useLoopingAudio";
import { forfeitPendingMatch, getPendingMatch, me, type PendingMatch, type PlayerProfile } from "../../libs/api";
import { getDefaultLocalDeck, getSelectedDeckId, loadLocalDecks, type LocalDeck } from "../../libs/localDecks";
import { getCachedPendingMatch, setCachedPendingMatch } from "../../libs/profileCache";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

function OnlinePlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRoomCode = searchParams.get("room") ?? undefined;
  const resumeConfirmed = searchParams.get("resume") === "1";
  const resumeRoomCode = resumeConfirmed ? requestedRoomCode : undefined;
  const controller = useGameMatch(resumeRoomCode);
  const [profile, setProfile] = useState<PlayerProfile>();
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(() => {
    if (resumeConfirmed) return null;
    const cached = getCachedPendingMatch();
    return cached ? cached.match : null;
  });
  const [pendingMatchError, setPendingMatchError] = useState<string>();
  const [pendingMatchChecked, setPendingMatchChecked] = useState(() => {
    if (resumeConfirmed) return true;
    return getCachedPendingMatch() !== null;
  });
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);
  const [continuingPendingMatch, setContinuingPendingMatch] = useState(resumeConfirmed);
  const [selectedDeck, setSelectedDeck] = useState<LocalDeck>(getDefaultLocalDeck);
  const matchReady = controller.inGame || Boolean(controller.roomCode && controller.localPlayerId);
  const { muted, toggleMuted } = useLoopingAudio("/audio/play-page.mp3", 0.3, !matchReady);

  useEffect(() => {
    if (!controller.resumeRequired) return;
    setPendingMatch(controller.resumeRequired);
    setPendingMatchChecked(true);
  }, [controller.resumeRequired]);

  useEffect(() => {
    if (!resumeConfirmed || controller.status !== "Recovery failed") return;
    setContinuingPendingMatch(false);
    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setCachedPendingMatch(result.match);
        setPendingMatchError(controller.error);
      })
      .catch((error) => setPendingMatchError(
        error instanceof Error ? error.message : "Unable to check your active match."
      ));
  }, [controller.error, controller.status, resumeConfirmed]);

  useEffect(() => {
    if (!resumeConfirmed || !controller.roomCode || !controller.localPlayerId) return;
    // Consume the confirmation only after the authoritative game state arrives.
    // Removing it earlier can make Next render the pending-match flow again
    // while the WebSocket resume handshake is still in flight.
    window.history.replaceState(null, "", "/play");
  }, [controller.localPlayerId, controller.roomCode, resumeConfirmed]);

  useEffect(() => {
    void me().then(({ user }) => setProfile(user)).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (resumeConfirmed) {
      return;
    }

    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setCachedPendingMatch(result.match);
        setPendingMatchError(undefined);
      })
      .catch((error) => setPendingMatchError(
        error instanceof Error ? error.message : "Unable to check your active match."
      ))
      .finally(() => setPendingMatchChecked(true));
  }, [resumeConfirmed]);

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
      setPendingMatchError(
        error instanceof Error ? error.message : "Unable to leave the active match."
      );
    } finally {
      setResolvingPendingMatch(false);
    }
  };

  const startSearch = () => {
    // Do not let a click win the race against the active-match check.
    if (!pendingMatchChecked || pendingMatch) return;
    controller.startMatchmaking({ deckId: selectedDeck.deckId, cardIds: selectedDeck.cardIds });
  };

  const cancelSearch = () => {
    controller.cancelMatchmaking();
  };

  const handleBackToLobby = () => {
    if (controller.searching) {
      cancelSearch();
    }
    router.push("/");
  };

  const toggleMusic = () => {
    toggleMuted();
  };

  // Keep the board mounted while the opponent reconnects. Unmounting it would
  // dispose this player's socket as well, causing the server to remove the room.
  if (controller.roomCode && controller.localPlayerId) {
    return (
      <GameBoardView
        controller={controller}
        localPlayerId={controller.localPlayerId}
        opponentConnected={controller.opponentConnected}
        connectionStatus={`${controller.status} · Room ${controller.roomCode}`}
      />
    );
  }

  if (resumeConfirmed && !controller.roomCode && controller.status !== "Recovery failed") {
    return (
      <main className="matchmaking-shell" style={{ minHeight: "100vh" }}>
        <div className="matchmaking-grid" aria-hidden="true" />
        <div className="matchmaking-art" aria-hidden="true">
          <PhaserSplash />
        </div>
        <div className="matchmaking-shade" aria-hidden="true" />

        <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px", zIndex: 10, position: "relative" }}>
          <p className="lobby-eyebrow" style={{ margin: 0 }}>Verifying connection</p>
          <div className="leaderboard-state" style={{ minHeight: "auto" }}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  const playerName = profile?.username ?? "Prism Operative";
  const playerInitial = playerName.slice(0, 1).toUpperCase();
  const winRate = profile && profile.wins + profile.losses > 0
    ? Math.round((profile.wins / (profile.wins + profile.losses)) * 100)
    : 0;
  return (
    <main className={`matchmaking-shell ${controller.searching ? "is-searching" : ""} ${pendingMatch ? "is-pending-match" : ""}`}>
      <div className="matchmaking-grid" aria-hidden="true" />
      <div className="matchmaking-art" aria-hidden="true"><PhaserSplash /></div>
      <div className="matchmaking-shade" aria-hidden="true" />

      <header className="matchmaking-header">
        <button className="matchmaking-back" onClick={handleBackToLobby} aria-label="Return to lobby" title="Return to lobby">
          <ArrowLeft size={18} />
          <span>Lobby</span>
        </button>
        <div className="matchmaking-title"><span>CHRONO GENESIS TCG</span><small>RANKED CIRCUIT</small></div>
        <button className="matchmaking-audio" onClick={toggleMusic} aria-label={muted ? "Enable matchmaking music" : "Mute matchmaking music"} title={muted ? "Enable music" : "Mute music"}>
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </header>

      <section className="matchmaking-content">
        <motion.div
          className="matchmaking-kicker"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Radio size={15} /> Ranked matchmaking
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
        >
          {controller.searching ? <>Seeking a <em>rival</em></> : <>Ready your <em>deck</em></>}
        </motion.h1>

        <motion.p
          className="matchmaking-lede"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.16 }}
        >
          {controller.searching ? "Scanning the circuit for a worthy opponent." : "Enter the ranked circuit and test your strategy under pressure."}
        </motion.p>

        <motion.section
          className="matchmaking-console"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.2 }}
          aria-label="Ranked matchmaking"
        >
          <div className="matchmaking-console__top">
            <div className="matchmaking-player">
              <div className="matchmaking-avatar">
                <span>{playerInitial}</span>
                {profile?.avatar ? <img src={profile.avatar} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
              </div>
              <div>
                <strong>{playerName}</strong>
                <span><ShieldCheck size={13} /> Prism Vanguard</span>
              </div>
            </div>
          </div>

          <div className="matchmaking-scan" aria-live="polite">
            <div className="scan-core">
              <div className="scan-ring scan-ring--outer" />
              <div className="scan-ring scan-ring--inner" />
              {controller.searching ? <CircleDotDashed size={42} /> : <Search size={39} />}
            </div>
            <div className="scan-copy">
              <small>{controller.searching ? "Queue time" : "Ranked Duel"}</small>
              <strong>{controller.searching ? formatTime(controller.queueTime) : `${profile?.elo?.toLocaleString() ?? "1,200"} ELO`}</strong>
              <span>{controller.searching ? "Match parameters synced" : controller.status}</span>
            </div>
          </div>

          <div className="matchmaking-stats">
            <span><small>Win rate</small><strong>{winRate}%</strong></span>
            <span><small>Record</small><strong>{profile ? `${profile.wins} - ${profile.losses}` : "--"}</strong></span>
            <span><small>Region</small><strong>SEA</strong></span>
          </div>

          {controller.error ? <p className="matchmaking-error">{controller.error}</p> : null}

          {controller.searching ? (
            <button className="matchmaking-command matchmaking-command--cancel" onClick={cancelSearch}>
              <X size={19} /> Cancel search
            </button>
          ) : (
            <button className="matchmaking-command" onClick={startSearch} disabled={!pendingMatchChecked || Boolean(pendingMatch)}>
              <Search size={19} /> {!pendingMatchChecked ? "Verifying arena status..." : "Find match"}
            </button>
          )}
        </motion.section>

        <DeckSelectionPanel
          className="matchmaking-deck-panel"
          disabled={controller.searching}
          onDeckChange={setSelectedDeck}
        />

        {pendingMatchError ? <p className="pending-match-check-error" role="alert">{pendingMatchError}</p> : null}
        {pendingMatch ? <PendingMatchDialog status={pendingMatch.status} isResolving={resolvingPendingMatch} isContinuing={continuingPendingMatch} onContinue={resumePendingMatch} onForfeit={abandonPendingMatch} /> : null}

        <div className={`matchmaking-track ${controller.searching ? "is-playing" : ""}`}>
          <Headphones size={15} />
          <span>{controller.searching ? "Find Match" : "Matchmaking signal ready"}</span>
          <i />
        </div>
      </section>
    </main>
  );
}

function TrialPlayPageContent() {
  const [selectedDeck, setSelectedDeck] = useState<LocalDeck>(() => {
    const decks = loadLocalDecks();
    const selectedId = getSelectedDeckId();
    return decks.find((deck) => deck.deckId === selectedId) ?? decks[0] ?? getDefaultLocalDeck();
  });
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(() => {
    const cached = getCachedPendingMatch();
    return cached ? cached.match : null;
  });
  const [pendingMatchChecked, setPendingMatchChecked] = useState(() => {
    return getCachedPendingMatch() !== null;
  });
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);
  const [continuingPendingMatch, setContinuingPendingMatch] = useState(false);

  useEffect(() => {
    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setCachedPendingMatch(result.match);
      })
      .catch(() => undefined)
      .finally(() => setPendingMatchChecked(true));
  }, []);

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
    try {
      await forfeitPendingMatch();
      setPendingMatch(null);
      setCachedPendingMatch(null);
    } finally {
      setResolvingPendingMatch(false);
    }
  };

  if (pendingMatch) {
    return (
      <PendingMatchDialog
        status={pendingMatch.status}
        isResolving={resolvingPendingMatch}
        isContinuing={continuingPendingMatch}
        onContinue={resumePendingMatch}
        onForfeit={abandonPendingMatch}
      />
    );
  }

  if (!selectedDeck) {
    return <div className="trial-loading">Preparing trial deck...</div>;
  }

  return <TrialGame deck={selectedDeck} />;
}

function TrialGame({ deck }: { deck: LocalDeck }) {
  const router = useRouter();
  const controller = useLocalGame({ trialMode: true, playerDeckCardIds: deck.cardIds });
  return (
    <GameBoardView
      controller={controller}
      trialMode
      onExitTrial={() => router.push("/")}
    />
  );
}

function RouteRedirect({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => router.replace(href), [href, router]);
  return null;
}

function PlayPageContent() {
  const searchParams = useSearchParams();
  if (searchParams.get("trial") === "1") return <TrialPlayPageContent />;
  if (searchParams.get("custom") === "create") return <RouteRedirect href="/room-create" />;

  const isResume = searchParams.get("resume") === "1";
  const legacyRoomCode = searchParams.get("room")?.trim().toUpperCase();
  if (!isResume && legacyRoomCode && /^[A-HJ-NP-Z2-9]{6}$/.test(legacyRoomCode)) {
    return <RouteRedirect href={`/room-join?room=${encodeURIComponent(legacyRoomCode)}`} />;
  }
  return <OnlinePlayPageContent />;
}

import { AuthGuard } from "../../components/lobby/AuthGuard";

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="matchmaking-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0c', color: '#fff' }}>
        <span>Loading Ranked Circuit...</span>
      </div>
    }>
      <AuthGuard>
        <PlayPageContent />
      </AuthGuard>
    </Suspense>
  );
}
