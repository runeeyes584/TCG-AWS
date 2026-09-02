"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Headphones,
  Radio,
  Volume2,
  VolumeX,
} from "lucide-react";
import { GameBoardView } from "../../components/game/GameBoard";
import { PhaserSplash } from "../../components/lobby/PhaserSplash";
import { PendingMatchDialog } from "../../components/lobby/PendingMatchDialog";
import { DeckSelectionPanel } from "../../components/deck/DeckSelectionPanel";
import {
  GladiatorDossierCard,
  MatchmakingActionBar,
} from "../../components/matchmaking/FindMatchConsole";
import { MatchSearchingOverlay } from "../../components/matchmaking/MatchSearchingOverlay";
import {
  MatchFoundShowcase,
  type ShowcasePlayer,
} from "../../components/matchmaking/MatchFoundShowcase";
import { useGameMatch } from "../../hooks/useGameMatch";
import { useLocalGame } from "../../hooks/useLocalGame";
import { useLoopingAudio } from "../../hooks/useLoopingAudio";
import {
  forfeitPendingMatch,
  getPendingMatch,
  me,
  type PendingMatch,
  type PlayerProfile,
} from "../../libs/api";
import {
  getDefaultLocalDeck,
  getSelectedDeckId,
  loadLocalDecks,
  type LocalDeck,
} from "../../libs/localDecks";
import {
  getCachedPendingMatch,
  setCachedPendingMatch,
  getCachedProfile,
  setCachedProfile,
} from "../../libs/profileCache";
import { AuthGuard } from "../../components/lobby/AuthGuard";

function OnlinePlayPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedRoomCode = searchParams.get("room") ?? undefined;
  // Keep the resume decision stable for this page session. Next.js integrates
  // native history.replaceState with the App Router, so reading `resume` from
  // searchParams directly would turn it off when the URL is cleaned up after
  // recovery and mount the match-found showcase again.
  const [isResumeSession] = useState(() => searchParams.get("resume") === "1");
  const resumeRoomCode = isResumeSession ? requestedRoomCode : undefined;
  const controller = useGameMatch(resumeRoomCode);
  const [profile, setProfile] = useState<PlayerProfile | undefined>(() => {
    const cached = getCachedProfile();
    return cached ? (cached as PlayerProfile) : undefined;
  });
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(() => {
    if (isResumeSession) return null;
    const cached = getCachedPendingMatch();
    return cached ? cached.match : null;
  });
  const [pendingMatchError, setPendingMatchError] = useState<string>();
  const [pendingMatchChecked, setPendingMatchChecked] = useState(() => {
    if (isResumeSession) return true;
    return getCachedPendingMatch() !== null;
  });
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);
  const [continuingPendingMatch, setContinuingPendingMatch] = useState(isResumeSession);
  const [selectedDeck, setSelectedDeck] = useState<LocalDeck>(getDefaultLocalDeck);
  const [showcaseCompleted, setShowcaseCompleted] = useState(false);

  useEffect(() => {
    if (!controller.roomCode) {
      setShowcaseCompleted(false);
    }
  }, [controller.roomCode]);

  const matchReady =
    controller.inGame || Boolean(controller.roomCode && controller.localPlayerId);
  const { muted, toggleMuted } = useLoopingAudio("/audio/play-page.mp3", 0.3, !matchReady);

  useEffect(() => {
    if (!controller.resumeRequired) return;
    setPendingMatch(controller.resumeRequired);
    setPendingMatchChecked(true);
  }, [controller.resumeRequired]);

  useEffect(() => {
    if (!isResumeSession || controller.status !== "Recovery failed") return;
    setContinuingPendingMatch(false);
    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setCachedPendingMatch(result.match);
        setPendingMatchError(controller.error);
      })
      .catch((error) =>
        setPendingMatchError(
          error instanceof Error
            ? error.message
            : "Unable to check your active match."
        )
      );
  }, [controller.error, controller.status, isResumeSession]);

  useEffect(() => {
    if (!isResumeSession || !controller.roomCode || !controller.localPlayerId) return;
    window.history.replaceState(null, "", "/play");
  }, [controller.localPlayerId, controller.roomCode, isResumeSession]);

  useEffect(() => {
    void me()
      .then(({ user }) => {
        if (user) {
          setProfile((prev) => {
            if (
              prev &&
              prev.id === user.id &&
              prev.username === user.username &&
              prev.avatar === user.avatar &&
              prev.elo === user.elo &&
              prev.wins === user.wins &&
              prev.losses === user.losses
            ) {
              return prev;
            }
            return user;
          });
          setCachedProfile(user);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (isResumeSession) return;

    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setCachedPendingMatch(result.match);
        setPendingMatchError(undefined);
      })
      .catch((error) =>
        setPendingMatchError(
          error instanceof Error
            ? error.message
            : "Unable to check your active match."
        )
      )
      .finally(() => setPendingMatchChecked(true));
  }, [isResumeSession]);

  const resumePendingMatch = () => {
    if (pendingMatch) {
      setContinuingPendingMatch(true);
      window.requestAnimationFrame(() => {
        window.location.assign(
          `/play?room=${encodeURIComponent(pendingMatch.roomCode)}&resume=1`
        );
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
        error instanceof Error
          ? error.message
          : "Unable to leave the active match."
      );
    } finally {
      setResolvingPendingMatch(false);
    }
  };

  const startSearch = () => {
    if (!pendingMatchChecked || pendingMatch || !controller.socketConnected) return;
    setShowcaseCompleted(false);
    controller.startMatchmaking({
      deckId: selectedDeck.deckId,
      cardIds: selectedDeck.cardIds,
    });
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

  // A resumed match goes straight to the board; the showcase belongs only to
  // the initial successful matchmaking flow.
  if (controller.roomCode && controller.localPlayerId) {
    if (!isResumeSession && !showcaseCompleted) {
      const localId = controller.localPlayerId;
      const oppId = localId === "P1" ? "P2" : "P1";
      const localProfile = controller.playerProfiles?.[localId];
      const oppProfile = controller.playerProfiles?.[oppId];

      const localShowcase: ShowcasePlayer = {
        username: localProfile?.username ?? profile?.username ?? "Prism Operative",
        avatar: localProfile?.avatar ?? profile?.avatar,
        elo: localProfile?.elo ?? profile?.elo ?? 1200,
        title: "Prism Vanguard",
      };

      const oppShowcase: ShowcasePlayer = {
        username: oppProfile?.username ?? "Nexus Challenger",
        avatar: oppProfile?.avatar,
        elo: oppProfile?.elo ?? (profile?.elo ? profile.elo + 30 : 1230),
        title: "Nexus Contender",
      };

      return (
        <MatchFoundShowcase
          localPlayer={localShowcase}
          opponent={oppShowcase}
          onComplete={() => setShowcaseCompleted(true)}
          durationSeconds={10}
        />
      );
    }

    return (
      <GameBoardView
        controller={controller}
        localPlayerId={controller.localPlayerId}
        opponentConnected={controller.opponentConnected}
        connectionStatus={`${controller.status} · Room ${controller.roomCode}`}
      />
    );
  }

  if (isResumeSession && !controller.roomCode && controller.status !== "Recovery failed") {
    return (
      <main className="matchmaking-shell" style={{ minHeight: "100vh" }}>
        <div className="matchmaking-grid" aria-hidden="true" />
        <div className="matchmaking-art" aria-hidden="true">
          <PhaserSplash />
        </div>
        <div className="matchmaking-shade" aria-hidden="true" />

        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            zIndex: 10,
            position: "relative",
          }}
        >
          <p className="lobby-eyebrow" style={{ margin: 0 }}>
            Verifying connection
          </p>
          <div className="leaderboard-state" style={{ minHeight: "auto" }}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`matchmaking-shell ${
        controller.searching ? "is-searching" : ""
      } ${pendingMatch ? "is-pending-match" : ""}`}
    >
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
          onClick={handleBackToLobby}
          aria-label="Return to lobby"
          title="Return to lobby"
        >
          <ArrowLeft size={16} />
          <span>Lobby</span>
        </button>
        <div className="matchmaking-title">
          <span>CHRONO GENESIS TCG</span>
          <small>RANKED CIRCUIT</small>
        </div>
        <button
          type="button"
          className="matchmaking-audio"
          onClick={toggleMusic}
          aria-label={muted ? "Enable matchmaking music" : "Mute matchmaking music"}
          title={muted ? "Enable music" : "Mute music"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </header>

      {/* Main Content Area - Cyber Matrix Split Panel */}
      <section className="matchmaking-content">
        <motion.div
          className="matchmaking-kicker"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <Radio size={13} /> RANKED CIRCUIT // SEASON 01
        </motion.div>

        <motion.h1
          className="matchmaking-heading-compact"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
        >
          BATTLE <em>DEPLOYMENT</em>
        </motion.h1>

        {/* Module 1: Gladiator Dossier & Ranked Metrics */}
        <GladiatorDossierCard
          profile={profile}
          statusText={controller.status}
        />

        {/* Module 2: Tactical Combat Loadout & 3D Fan-out Cards */}
        <DeckSelectionPanel
          className="matchmaking-deck-panel"
          disabled={controller.searching}
          onDeckChange={setSelectedDeck}
        />

        {/* Module 3: Biometric Waveform & Engage CTA */}
        <MatchmakingActionBar
          disabled={!pendingMatchChecked || Boolean(pendingMatch) || !controller.socketConnected}
          onStartSearch={startSearch}
          errorText={controller.error}
        />

        {pendingMatchError ? (
          <p className="pending-match-check-error" role="alert">
            {pendingMatchError}
          </p>
        ) : null}

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

      {/* Abyssal Searching Overlay (Wildness & Mystery Vortex) */}
      <AnimatePresence>
        {controller.searching ? (
          <MatchSearchingOverlay
            queueTime={controller.queueTime}
            onCancel={cancelSearch}
          />
        ) : null}
      </AnimatePresence>
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

export default function PlayPage() {
  return (
    <Suspense
      fallback={
        <div
          className="matchmaking-shell"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100vh",
            background: "#02040b",
            color: "#fff",
          }}
        >
          <span>Loading Ranked Circuit...</span>
        </div>
      }
    >
      <AuthGuard>
        <PlayPageContent />
      </AuthGuard>
    </Suspense>
  );
}
