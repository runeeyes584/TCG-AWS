"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  ChevronRight,
  FlaskConical,
  Hash,
  Layers3,
  LogOut,
  Menu,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { forfeitPendingMatch, getPendingMatch, me, type PendingMatch, type PlayerProfile } from "../libs/api";
import { PhaserSplash } from "../components/lobby/PhaserSplash";
import { PendingMatchDialog, PendingMatchLoadingGate } from "../components/lobby/PendingMatchDialog";
import { DeckSelectionPanel } from "../components/deck/DeckSelectionPanel";
import { useLoopingAudio } from "../hooks/useLoopingAudio";

type LobbyTab = "duel" | "deck" | "collection" | "custom" | "trial";

const tabs: Array<{ id: LobbyTab; label: string; icon: typeof Swords }> = [
  { id: "duel", label: "Duel", icon: Swords },
  { id: "deck", label: "Deck", icon: Layers3 },
  { id: "collection", label: "Collection", icon: BookOpen },
  { id: "custom", label: "Custom Match", icon: Hash },
  { id: "trial", label: "Trial", icon: FlaskConical },
];

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<LobbyTab>("duel");
  const [playerName, setPlayerName] = useState("Guest Operative");
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [elo, setElo] = useState(1200);
  const [avatar, setAvatar] = useState<string | undefined>();
  const [email, setEmail] = useState("guest@kaleidoscope.local");
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [pendingMatch, setPendingMatch] = useState<PendingMatch | null>(null);
  const [pendingMatchError, setPendingMatchError] = useState<string>();
  const [pendingMatchChecked, setPendingMatchChecked] = useState(true);
  const [resolvingPendingMatch, setResolvingPendingMatch] = useState(false);
  const [customRoomCode, setCustomRoomCode] = useState("");
  const { muted, toggleMuted } = useLoopingAudio("/audio/lobbybgm.mp3", 0.3);

  useEffect(() => {
    const email = window.localStorage.getItem("email");
    const token = window.localStorage.getItem("accessToken");

    if (email) {
      setPlayerName(email.split("@")[0]);
      setEmail(email);
    }

    const signedIn = Boolean(token);
    setIsSignedIn(signedIn);

    if (!signedIn) {
      setPendingMatchChecked(true);
      return;
    }

    void me()
      .then(({ user }) => {
        if (!user) return;

        const profile = user as PlayerProfile;
        setPlayerName(profile.username || email?.split("@")[0] || "Operative");
        setElo(profile.elo ?? 1200);
        setAvatar(profile.avatar);
        setEmail(profile.email || email || "guest@kaleidoscope.local");
        setWins(profile.wins ?? 0);
        setLosses(profile.losses ?? 0);
      })
      .catch(() => undefined);

    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setPendingMatchError(undefined);
      })
      .catch((error) => setPendingMatchError(
        error instanceof Error ? error.message : "Unable to check your active match."
      ))
      .finally(() => setPendingMatchChecked(true));
  }, []);

  const startDuel = () => {
    router.push(isSignedIn ? "/play" : "/login");
  };

  const createCustomMatch = () => {
    router.push(isSignedIn ? "/room-create" : "/login");
  };

  const startTrial = () => {
    router.push("/play?trial=1");
  };

  const joinCustomMatch = () => {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    const roomCode = customRoomCode.trim().toUpperCase();
    if (!roomCode) {
      return;
    }

    router.push(`/room-join?room=${encodeURIComponent(roomCode)}`);
  };

  const signOut = () => {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("email");
    setIsSignedIn(false);
    setPlayerName("Guest Operative");
    setElo(1200);
    setAvatar(undefined);
    setEmail("guest@kaleidoscope.local");
    setWins(0);
    setLosses(0);
  };

  const resumePendingMatch = () => {
    if (pendingMatch) {
      router.push(`/play?room=${encodeURIComponent(pendingMatch.roomCode)}&resume=1`);
    }
  };

  const abandonPendingMatch = async () => {
    setResolvingPendingMatch(true);
    setPendingMatchError(undefined);
    try {
      await forfeitPendingMatch();
      setPendingMatch(null);
      const { user } = await me();
      if (user) {
        setElo(user.elo);
        setWins(user.wins);
        setLosses(user.losses);
      }
    } catch (error) {
      setPendingMatchError(
        error instanceof Error ? error.message : "Unable to leave the active match."
      );
    } finally {
      setResolvingPendingMatch(false);
    }
  };

  return (
    <main className="lobby-shell">
      <div className="lobby-grid" aria-hidden="true" />
      <div className="lobby-vignette" aria-hidden="true" />

      <header className="lobby-topbar">
        <button className="lobby-brand" onClick={() => setActiveTab("duel")} aria-label="Kaleidoscope home">
          <span className="lobby-brand__mark"><Sparkles size={20} strokeWidth={2.4} /></span>
          <span>
            <strong>KALEIDOSCOPE</strong>
            <small>TACTICAL CARD GAME</small>
          </span>
        </button>

        <div className="lobby-topbar__actions">
          <div className="elo-display" title="Player Elo">
            <Trophy size={18} aria-hidden="true" />
            <span><small>ELO</small><strong>{elo.toLocaleString()}</strong></span>
          </div>
          <button className="lobby-icon-button" title={muted ? "Enable lobby music" : "Mute lobby music"} aria-label={muted ? "Enable lobby music" : "Mute lobby music"} onClick={toggleMuted}>
            {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          {isSignedIn ? (
            <button className="lobby-icon-button" title="Sign out" aria-label="Sign out" onClick={signOut}><LogOut size={19} /></button>
          ) : (
            <button className="lobby-menu-button" onClick={() => router.push("/login")}><Menu size={18} /> Sign in</button>
          )}
        </div>
      </header>

      <section className="lobby-profile" aria-label="Player profile">
        <div className="lobby-profile__avatar">
          <span>{playerName.slice(0, 1).toUpperCase()}</span>
          {avatar ? <img src={avatar} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
        </div>
        <div className="lobby-profile__identity">
          <strong>{playerName}</strong>
          <span title={email}><Shield size={13} /> {email}</span>
        </div>
        <div className="lobby-profile__stats" aria-label="Player statistics">
          <span><b>{elo.toLocaleString()}</b><small>ELO</small></span>
          <span><b>{wins}</b><small>WINS</small></span>
          <span><b>{losses}</b><small>LOSSES</small></span>
        </div>
      </section>

      <nav className="lobby-nav" aria-label="Main navigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`lobby-nav__item ${activeTab === id ? "is-active" : ""}`}
            onClick={() => {
              if (id === "deck") {
                router.push("/deck-builder");
                return;
              }
              if (id === "collection") {
                router.push("/gallery");
                return;
              }
              setActiveTab(id);
            }}
          >
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            <ChevronRight size={17} aria-hidden="true" />
          </button>
        ))}
      </nav>

      <section className="lobby-content">
        {activeTab === "duel" ? (
          <>
            <p className="lobby-eyebrow">Season 01 <span /> Ascendant Circuit</p>
            <h1>Enter the<br /><em>Prism Arena</em></h1>
            <p className="lobby-lede">Command your deck, read the field, and turn a single shard of advantage into victory.</p>

            <div className="lobby-queue">
              <div className="queue-copy"><small>Ranked Duel</small><strong>Prism Vanguard</strong></div>
              <div className="queue-elo"><small>YOUR ELO</small><strong>{elo.toLocaleString()}</strong></div>
              <button className="queue-action" onClick={startDuel}>
                <Swords size={20} />
                <span>{isSignedIn ? "Open matchmaking" : "Sign in to play"}</span>
              </button>
            </div>
          </>
        ) : activeTab === "custom" ? (
          <div className="lobby-custom-match">
            <p className="lobby-eyebrow">Private Room <span /> Friendly Duel</p>
            <h1>Custom<br /><em>Match</em></h1>
            <p className="lobby-lede">Create a room for a friend or enter their room ID to jump straight into a private duel.</p>

            <DeckSelectionPanel className="lobby-deck-selection" />

            <div className="custom-match-panel">
              <button className="queue-action custom-match-create" onClick={createCustomMatch}>
                <Swords size={20} />
                <span>{isSignedIn ? "Create room" : "Sign in to create"}</span>
              </button>

              <label className="custom-room-field">
                <span>Room ID</span>
                <input
                  value={customRoomCode}
                  maxLength={8}
                  inputMode="text"
                  autoCapitalize="characters"
                  placeholder="ABCDE"
                  onChange={(event) => setCustomRoomCode(event.target.value.toUpperCase())}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      joinCustomMatch();
                    }
                  }}
                />
              </label>

              <button
                className="queue-action custom-match-join"
                onClick={joinCustomMatch}
                disabled={isSignedIn && customRoomCode.trim().length === 0}
              >
                <Hash size={19} />
                <span>{isSignedIn ? "Join room" : "Sign in to join"}</span>
              </button>
            </div>
          </div>
        ) : activeTab === "trial" ? (
          <div className="lobby-trial-mode">
            <p className="lobby-eyebrow">Local Sandbox <span /> Solo Training</p>
            <h1>Trial<br /><em>Mode</em></h1>
            <p className="lobby-lede">Test cards and combos without matchmaking. Refill mana, draw cards, and refresh your attack token whenever you need.</p>

            <DeckSelectionPanel className="lobby-deck-selection" />

            <div className="trial-mode-panel">
              <span><Zap size={17} aria-hidden="true" /><b>Free resources</b><small>Mana controls</small></span>
              <span><BookOpen size={17} aria-hidden="true" /><b>Open draws</b><small>Draw on demand</small></span>
              <span><Swords size={17} aria-hidden="true" /><b>Repeat combat</b><small>Refresh attacks</small></span>
              <button className="queue-action" onClick={startTrial}>
                <FlaskConical size={19} aria-hidden="true" /> Start Trial
              </button>
            </div>
          </div>
        ) : (
          <div className="lobby-placeholder">
            <p className="lobby-eyebrow">Arsenal</p>
            <h1>{activeTab === "deck" ? "Build your\nDeck" : "Your Card\nCollection"}</h1>
            <p className="lobby-lede">The arena is ready. Deck construction and collection management will join this command station next.</p>
            <button className="queue-action queue-action--small" onClick={() => setActiveTab("duel")}><Swords size={18} /> Go to Duel</button>
          </div>
        )}
      </section>

      <div className="lobby-art" aria-hidden="true">
        <PhaserSplash />
      </div>

      <footer className="lobby-footer">
        <span><i /> Online services operational</span>
        <span>Kaleidoscope TCG <b>v0.1.0</b></span>
      </footer>

      {pendingMatchError ? <p className="pending-match-check-error" role="alert">{pendingMatchError}</p> : null}
      {!pendingMatchChecked ? <PendingMatchLoadingGate /> : null}
      {pendingMatch ? <PendingMatchDialog status={pendingMatch.status} isResolving={resolvingPendingMatch} onContinue={resumePendingMatch} onForfeit={abandonPendingMatch} /> : null}
    </main>
  );
}
