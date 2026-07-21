"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  CircleDotDashed,
  Crown,
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
import { useGameMatch } from "../../hooks/useGameMatch";
import { forfeitPendingMatch, getPendingMatch, me, type PendingMatch, type PlayerProfile } from "../../libs/api";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder.toString().padStart(2, "0")}`;
}

export default function PlayPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeRoomCode = searchParams.get("room") ?? undefined;
  const createCustomMatch = searchParams.get("custom") === "create";
  const controller = useGameMatch(resumeRoomCode);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const customCreateRequestedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>();
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);

  useEffect(() => {
    const audio = new Audio("/audio/findmatch.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.38;
    musicRef.current = audio;

    void me().then(({ user }) => setProfile(user)).catch(() => undefined);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      musicRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resumeRoomCode || createCustomMatch) {
      return;
    }

    void getPendingMatch()
      .then((result) => setPendingMatch(result.match))
      .catch(() => undefined);
  }, [createCustomMatch, resumeRoomCode]);

  useEffect(() => {
    if (
      !createCustomMatch ||
      resumeRoomCode ||
      customCreateRequestedRef.current ||
      controller.status !== "Connected"
    ) {
      return;
    }

    customCreateRequestedRef.current = true;
    controller.createRoom();
  }, [controller, createCustomMatch, resumeRoomCode]);

  const resumePendingMatch = () => {
    if (pendingMatch) {
      window.location.assign(`/play?room=${encodeURIComponent(pendingMatch.roomCode)}`);
    }
  };

  const abandonPendingMatch = async () => {
    setResolvingPendingMatch(true);
    try {
      await forfeitPendingMatch();
    } catch {
      // The disconnect timer may have resolved the match while this dialog was open.
    } finally {
      setPendingMatch(null);
      setResolvingPendingMatch(false);
    }
  };

  useEffect(() => {
    const audio = musicRef.current;
    if (!audio) return;

    audio.muted = muted;
    if (!controller.searching) {
      audio.pause();
      audio.currentTime = 0;
    }
  }, [controller.searching, muted]);

  const startSearch = () => {
    const audio = musicRef.current;
    if (audio && !muted) {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    }
    controller.startMatchmaking();
  };

  const cancelSearch = () => {
    controller.cancelMatchmaking();
    musicRef.current?.pause();
    if (musicRef.current) musicRef.current.currentTime = 0;
  };

  const toggleMusic = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);

    if (!nextMuted && controller.searching) {
      void musicRef.current?.play().catch(() => undefined);
    }
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
        <button className="matchmaking-back" onClick={() => router.push("/")} aria-label="Return to lobby" title="Return to lobby">
          <ArrowLeft size={18} />
          <span>Lobby</span>
        </button>
        <div className="matchmaking-title"><span>KALEIDOSCOPE</span><small>RANKED CIRCUIT</small></div>
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
            <div className="matchmaking-rank"><Crown size={16} /><span>VII</span></div>
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
            <button className="matchmaking-command" onClick={startSearch}>
              <Search size={19} /> Find match
            </button>
          )}
        </motion.section>

        {pendingMatch ? <PendingMatchDialog isResolving={resolvingPendingMatch} onContinue={resumePendingMatch} onForfeit={abandonPendingMatch} /> : null}

        <div className={`matchmaking-track ${controller.searching ? "is-playing" : ""}`}>
          <Headphones size={15} />
          <span>{controller.searching ? "Find Match" : "Matchmaking signal ready"}</span>
          <i />
        </div>
      </section>
    </main>
  );
}
