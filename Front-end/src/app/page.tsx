"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
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
  Settings,
  History,
  Zap
} from "lucide-react";

import {
  forfeitPendingMatch,
  getPendingMatch,
  me,
  type PendingMatch,
  type PlayerProfile
} from "../libs/api";
import { getCachedProfile, setCachedProfile, clearCachedProfile, setCachedPendingMatch } from "../libs/profileCache";
import { PhaserSplash } from "../components/lobby/PhaserSplash";
import { UserProfilePhaserEffects } from "../components/user/UserProfilePhaserEffects";
import { PendingMatchDialog } from "../components/lobby/PendingMatchDialog";
import { DeckSelectionPanel } from "../components/deck/DeckSelectionPanel";
import { useGlobalAudio } from "../contexts/AudioContext";
import { GlobalSoundModal } from "../components/audio/GlobalSoundModal";
import { SignOutConfirmDialog } from "../components/lobby/SignOutConfirmDialog";
import { useRealtimeRank } from "../hooks/useRealtimeRank";

type LobbyTab = "duel" | "deck" | "collection" | "custom" | "trial" | "rank global" | "history";

const tabs: Array<{ id: LobbyTab; label: string; icon: typeof Swords }> = [
  { id: "duel", label: "Duel", icon: Swords },
  { id: "deck", label: "Deck", icon: Layers3 },
  { id: "collection", label: "Collection", icon: BookOpen },
  { id: "custom", label: "Custom Match", icon: Hash },
  { id: "trial", label: "Trial", icon: FlaskConical },
  { id: "rank global", label: "Rank Global", icon: Trophy },
  { id: "history", label: "Match History", icon: History }
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
  const [continuingPendingMatch, setContinuingPendingMatch] = useState(false);

  // Global Audio & Modals
  const { playBgm, playSfx } = useGlobalAudio();
  const [isGearMenuOpen, setIsGearMenuOpen] = useState(false);
  const [isSoundModalOpen, setIsSoundModalOpen] = useState(false);
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const gearMenuRef = useRef<HTMLDivElement | null>(null);

  const currentRank = useRealtimeRank(isSignedIn);
  const totalMatches = wins + losses;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const powerLevel = Math.min(100, Math.max(10, Math.round((elo / 2200) * 100)));

  // Play Lobby BGM on mount
  useEffect(() => {
    playBgm("/audio/lobbybgm.mp3");
  }, [playBgm]);

  // Click outside / ESC listener for Gear Dropdown
  useEffect(() => {
    if (!isGearMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (gearMenuRef.current && !gearMenuRef.current.contains(e.target as Node)) {
        setIsGearMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsGearMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isGearMenuOpen]);

  useEffect(() => {
    const cached = getCachedProfile();
    const token = window.localStorage.getItem("accessToken");
    const email = window.localStorage.getItem("email");

    if (cached) {
      setPlayerName(cached.username);
      setAvatar(cached.avatar);
      setEmail(cached.email);
      setElo(cached.elo);
      setWins(cached.wins);
      setLosses(cached.losses);
    } else if (email) {
      setPlayerName(email.split("@")[0]);
      setEmail(email);
    }

    const signedIn = Boolean(token);
    setIsSignedIn(signedIn);

    if (!signedIn) {
      setPendingMatchChecked(true);
      return;
    }

    const handleAuthError = (error: unknown) => {
      const msg = error instanceof Error ? error.message : String(error);
      const isAuthErr =
        msg.includes("expired") ||
        msg.includes("hash") ||
        msg.includes("Unauthorized") ||
        msg.includes("token") ||
        msg.includes("sign in");

      if (isAuthErr) {
        clearCachedProfile();
        setIsSignedIn(false);
        setPlayerName("Guest Operative");
        setElo(1200);
        setAvatar(undefined);
        setEmail("guest@kaleidoscope.local");
        setWins(0);
        setLosses(0);
        setPendingMatchError("Your session has expired. Please sign in again.");
      } else {
        setPendingMatchError(msg || "Unable to check your active match.");
      }
    };

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

        setCachedProfile({
          id: profile.id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar,
          elo: profile.elo,
          wins: profile.wins,
          losses: profile.losses,
        });
      })
      .catch((error) => {
        handleAuthError(error);
      });

    void getPendingMatch()
      .then((result) => {
        setPendingMatch(result.match);
        setCachedPendingMatch(result.match);
        setPendingMatchError(undefined);
      })
      .catch((error) => {
        handleAuthError(error);
      })
      .finally(() => setPendingMatchChecked(true));
  }, []);

  const startDuel = () => {
    playSfx("click");
    router.push(isSignedIn ? "/play" : "/login");
  };

  const createCustomMatch = () => {
    playSfx("click");
    router.push(isSignedIn ? "/room-create" : "/login");
  };

  const startTrial = () => {
    playSfx("click");
    router.push("/play?trial=1");
  };

  const joinCustomMatch = () => {
    playSfx("click");
    router.push(isSignedIn ? "/room-join" : "/login");
  };

  const handleConfirmSignOut = () => {
    setIsSigningOut(true);
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("email");
    clearCachedProfile();
    setIsSignedIn(false);
    setPlayerName("Guest Operative");
    setElo(1200);
    setAvatar(undefined);
    setEmail("guest@kaleidoscope.local");
    setWins(0);
    setLosses(0);
    setIsSigningOut(false);
    setIsSignOutModalOpen(false);
    router.push("/login");
  };

  const resumePendingMatch = () => {
    if (pendingMatch) {
      setContinuingPendingMatch(true);
      window.requestAnimationFrame(() => {
        router.push(`/play?room=${encodeURIComponent(pendingMatch.roomCode)}&resume=1`);
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
            <strong>CHRONO GENESIS WEB GAME</strong>
            <small>LACRIMOSA'S LAST DANCE</small>
          </span>
        </button>

        <div className="lobby-topbar__actions">
          <div className="elo-display" title="Player Elo">
            <Trophy size={18} aria-hidden="true" />
            <span><small>ELO</small><strong>{elo.toLocaleString()}</strong></span>
          </div>

          {/* System Options Gear Button & Cyber Dropdown */}
          <div className="relative" ref={gearMenuRef}>
            <button
              className={`lobby-icon-button lobby-gear-btn ${isGearMenuOpen ? "is-active" : ""}`}
              title="System Options"
              aria-label="System Options"
              aria-expanded={isGearMenuOpen}
              onClick={() => {
                playSfx("click");
                setIsGearMenuOpen((prev) => !prev);
              }}
            >
              <Settings size={19} className={isGearMenuOpen ? "animate-spin-slow text-cyan-400" : ""} />
            </button>

            {isGearMenuOpen && (
              <div className="lobby-dropdown-menu" role="menu">
                <div className="lobby-dropdown-header">
                  <span>SYSTEM MATRIX</span>
                </div>

                <button
                  className="lobby-dropdown-item"
                  role="menuitem"
                  onClick={() => {
                    playSfx("click");
                    setIsGearMenuOpen(false);
                    setIsSoundModalOpen(true);
                  }}
                >
                  <div className="lobby-dropdown-item__icon">
                    <Volume2 size={16} />
                  </div>
                  <div className="lobby-dropdown-item__text">
                    <strong>Sound Settings</strong>
                    <small>Master, BGM & SFX</small>
                  </div>
                </button>

                <div className="lobby-dropdown-divider" />

                {isSignedIn ? (
                  <button
                    className="lobby-dropdown-item lobby-dropdown-item--danger"
                    role="menuitem"
                    onClick={() => {
                      playSfx("click");
                      setIsGearMenuOpen(false);
                      setIsSignOutModalOpen(true);
                    }}
                  >
                    <div className="lobby-dropdown-item__icon">
                      <LogOut size={16} />
                    </div>
                    <div className="lobby-dropdown-item__text">
                      <strong>Sign Out</strong>
                      <small>Disconnect uplink</small>
                    </div>
                  </button>
                ) : (
                  <button
                    className="lobby-dropdown-item"
                    role="menuitem"
                    onClick={() => {
                      playSfx("click");
                      setIsGearMenuOpen(false);
                      router.push("/login");
                    }}
                  >
                    <div className="lobby-dropdown-item__icon">
                      <Menu size={16} />
                    </div>
                    <div className="lobby-dropdown-item__text">
                      <strong>Sign In</strong>
                      <small>Connect operative</small>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <section
        className="lobby-profile"
        aria-label={`View ${playerName}'s player profile`}
        role="link"
        tabIndex={0}
        onClick={() => {
          playSfx("click");
          router.push("/user");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            playSfx("click");
            router.push("/user");
          }
        }}
      >
        <div className="lobby-profile__fx" aria-hidden="true">
          <UserProfilePhaserEffects />
        </div>
        <div className="lobby-profile__topline">
          <span><i /> Player uplink</span>
          <b>CG // PROFILE</b>
        </div>

        <div className="lobby-profile__main">
          <div className="lobby-profile__avatar-wrap">
            <div className="lobby-profile__avatar-ring" aria-hidden="true" />
            <div className="lobby-profile__avatar">
              <span>{playerName.slice(0, 1).toUpperCase()}</span>
              {avatar ? <img src={avatar} alt="" onError={(event) => event.currentTarget.remove()} /> : null}
            </div>
            <span className="lobby-profile__level">PWR {powerLevel}</span>
          </div>

          <div className="lobby-profile__identity">
            <small>Authenticated duelist</small>
            <strong>{playerName}</strong>
            <span title={email}><Shield size={12} /> {email}</span>
          </div>

          <ChevronRight className="lobby-profile__open-icon" size={18} aria-hidden="true" />
        </div>

        <div className="lobby-profile__stats" aria-label="Player statistics">
          <span className="lobby-stat"><b>{elo.toLocaleString()}</b><small>ELO</small></span>
          <span className="lobby-stat lobby-stat--rank"><b>{currentRank ? `#${currentRank}` : "—"}</b><small>RANK</small></span>
          <span className="lobby-stat"><b>{wins}</b><small>WINS</small></span>
          <span className="lobby-stat"><b>{losses}</b><small>LOSSES</small></span>
        </div>

        <div className="lobby-profile__power">
          <span><Activity size={11} /> Power sync <b>{powerLevel}%</b></span>
          <i><b style={{ width: `${powerLevel}%` }} /></i>
          <small>{totalMatches ? `${winRate}% win rate` : "No combat data"} · View dossier</small>
        </div>
      </section>

      <nav className="lobby-nav" aria-label="Main navigation">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`lobby-nav__item ${activeTab === id ? "is-active" : ""}`}
            onClick={() => {
              playSfx("click");
              if (id === "deck") {
                router.push("/deck-builder");
                return;
              }
              if (id === "collection") {
                router.push("/gallery");
                return;
              }
              if (id === "rank global") {
                router.push("/rank");
                return;
              }
              if (id === "history") {
                router.push("/history");
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
                <span>{isSignedIn ? "Enter Battlefield" : "Sign in to play"}</span>
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

              <button className="queue-action custom-match-join" onClick={joinCustomMatch}>
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
            <button className="queue-action queue-action--small" onClick={() => { playSfx("click"); setActiveTab("duel"); }}><Swords size={18} /> Go to Duel</button>
          </div>
        )}
      </section>

      <div className="lobby-art" aria-hidden="true">
        <PhaserSplash />
      </div>

      <footer className="lobby-footer">
        <span><i /> Online services operational</span>
        <span>Chrono Genesis TCG <b>v0.1.0</b></span>
      </footer>

      {pendingMatchError ? <p className="pending-match-check-error" role="alert">{pendingMatchError}</p> : null}
      {pendingMatch ? <PendingMatchDialog status={pendingMatch.status} isResolving={resolvingPendingMatch} isContinuing={continuingPendingMatch} onContinue={resumePendingMatch} onForfeit={abandonPendingMatch} /> : null}

      {/* Global Sound Matrix Modal */}
      <GlobalSoundModal
        isOpen={isSoundModalOpen}
        onClose={() => setIsSoundModalOpen(false)}
      />

      {/* Sign Out Confirmation Dialog */}
      <SignOutConfirmDialog
        isOpen={isSignOutModalOpen}
        onCancel={() => setIsSignOutModalOpen(false)}
        onConfirm={handleConfirmSignOut}
        isSubmitting={isSigningOut}
      />
    </main>
  );
}
