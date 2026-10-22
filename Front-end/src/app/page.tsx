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
  LogIn,
  LogOut,
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
  isAuthError,
  isServerUnavailable,
  me,
  type ApiError,
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
import { ChronoCommandCompass, type LobbyTab } from "../components/lobby/ChronoCommandCompass";
import { Eyebrow, EyebrowRule, Lede } from "../components/ui/layout";
import { Button } from "../components/ui/button";

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
      // An API answer is judged by its status alone; the wording is only a fallback for errors raised in the client.
      const hasStatus = typeof (error as ApiError | undefined)?.status === "number";
      const isAuthErr = hasStatus ? isAuthError(error) :
        msg.includes("expired") ||
        msg.includes("hash") ||
        msg.includes("Unauthorized") ||
        msg.includes("token") ||
        msg.includes("sign in") ||
        msg.includes("HTTP 401") ||
        msg.includes("HTTP 403");

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
        setPendingMatchError(
          isServerUnavailable(error)
            ? "The server is starting up. Please try again in a few seconds."
            : msg || "Unable to check your active match."
        );
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

  const handleConfirmTab = (tab: LobbyTab) => {
    playSfx("click");
    if (tab === "duel") {
      startDuel();
    } else if (tab === "deck") {
      router.push("/deck-builder");
    } else if (tab === "collection") {
      router.push("/gallery");
    } else if (tab === "custom") {
      createCustomMatch();
    } else if (tab === "trial") {
      startTrial();
    } else if (tab === "rank global") {
      router.push("/rank");
    } else if (tab === "history") {
      router.push("/history");
    }
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
            <strong>CHRONO GENESIS GAME</strong>
            <small>LACRIMOSA'S LAST DANCE</small>
          </span>
        </button>

        <div className="lobby-topbar__actions">
          {/* Tactical User Capsule on Header (Callsign, RANK, ELO, Avatar) */}
          <button
            className={`lobby-header-profile ${!isSignedIn ? "is-guest" : ""}`}
            onClick={() => {
              playSfx("click");
              if (!isSignedIn) {
                router.push("/login");
                return;
              }
              setCachedProfile({
                username: playerName,
                avatar: avatar,
                elo: elo,
                rank: currentRank,
                wins: wins,
                losses: losses,
              });
              router.push("/user");
            }}
            title={isSignedIn ? `View ${playerName}'s dossier` : "Click to sign in operative"}
            aria-label={isSignedIn ? "Player profile dossier" : "Sign in operative"}
          >
            <div className="lobby-header-profile__avatar-wrap">
              <div className="lobby-header-profile__avatar-ring" aria-hidden="true" />
              <div className="lobby-header-profile__avatar">
                {avatar ? (
                  <img src={avatar} alt="" onError={(e) => e.currentTarget.remove()} />
                ) : (
                  <span>{playerName.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
            </div>

            <div className="lobby-header-profile__info">
              <span className="lobby-header-profile__callsign">{playerName}</span>
              <div className="lobby-header-profile__badges">
                {isSignedIn ? (
                  <>
                    <span className="lobby-header-profile__rank">{currentRank ? `#${currentRank}` : "UNRANKED"}</span>
                    <span className="lobby-header-profile__sep">·</span>
                    <span className="lobby-header-profile__elo">{elo.toLocaleString()} ELO</span>
                  </>
                ) : (
                  <span className="lobby-header-profile__guest-cta">UNRANKED · TAP TO SIGN IN</span>
                )}
              </div>
            </div>

            <ChevronRight size={14} className="lobby-header-profile__arrow" aria-hidden="true" />
          </button>

          {/* System Matrix Gear Menu (Always accessible for both Guest and Authenticated Operative) */}
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
              <Settings size={20} className={isGearMenuOpen ? "animate-spin-slow text-cyan-400" : ""} />
            </button>

            {isGearMenuOpen && (
              <div className="lobby-dropdown-menu" role="menu">
                <div className="lobby-dropdown-header">
                  <span>OPERATIVE MATRIX</span>
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
                    className="lobby-dropdown-item lobby-dropdown-item--primary"
                    role="menuitem"
                    onClick={() => {
                      playSfx("click");
                      setIsGearMenuOpen(false);
                      router.push("/login");
                    }}
                  >
                    <div className="lobby-dropdown-item__icon">
                      <LogIn size={16} />
                    </div>
                    <div className="lobby-dropdown-item__text">
                      <strong>Sign In</strong>
                      <small>Connect operative profile</small>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <ChronoCommandCompass
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onConfirmTab={handleConfirmTab}
      />

      <section className="lobby-content">
        {activeTab === "duel" ? (
          <>
            <Eyebrow>Season 01<EyebrowRule />Ascendant Circuit</Eyebrow>
            <h1>Enter the<br /><em>Prism Arena</em></h1>
            <Lede>Command your deck, read the field, and turn a single shard of advantage into victory.</Lede>

            <div className="lobby-queue">
              <div className="queue-copy"><small>Ranked Duel</small><strong>Prism Vanguard</strong></div>
              <div className="queue-elo"><small>YOUR ELO</small><strong>{elo.toLocaleString()}</strong></div>
              <Button className="lobby-cta" variant="primary" size="md" icon={<Swords size={20} />} onClick={startDuel}>
                {isSignedIn ? "Enter Battlefield" : "Sign in to play"}
              </Button>
            </div>
          </>
        ) : activeTab === "custom" ? (
          <div className="lobby-custom-match">
            <Eyebrow>Private Room<EyebrowRule />Friendly Duel</Eyebrow>
            <h1>Custom<br /><em>Match</em></h1>
            <Lede>Create a room for a friend or enter their room ID to jump straight into a private duel.</Lede>

            <DeckSelectionPanel className="lobby-deck-selection" />

            <div className="custom-match-panel">
              <Button className="lobby-cta" variant="primary" size="lg" fullWidth icon={<Swords size={20} />} onClick={createCustomMatch}>
                {isSignedIn ? "Create room" : "Sign in to create"}
              </Button>

              <Button className="lobby-cta" variant="info" size="lg" fullWidth icon={<Hash size={19} />} onClick={joinCustomMatch}>
                {isSignedIn ? "Join room" : "Sign in to join"}
              </Button>
            </div>
          </div>
        ) : activeTab === "trial" ? (
          <div className="lobby-trial-mode">
            <Eyebrow>Local Sandbox<EyebrowRule />Solo Training</Eyebrow>
            <h1>Trial<br /><em>Mode</em></h1>
            <Lede>Test cards and combos without matchmaking. Refill mana, draw cards, and refresh your attack token whenever you need.</Lede>

            <DeckSelectionPanel className="lobby-deck-selection" />

            <div className="trial-mode-panel">
              <span><Zap size={17} aria-hidden="true" /><b>Free resources</b><small>Mana controls</small></span>
              <span><BookOpen size={17} aria-hidden="true" /><b>Open draws</b><small>Draw on demand</small></span>
              <span><Swords size={17} aria-hidden="true" /><b>Repeat combat</b><small>Refresh attacks</small></span>
              <Button className="lobby-cta" variant="primary" size="lg" icon={<FlaskConical size={19} />} onClick={startTrial}>
                Start Trial
              </Button>
            </div>
          </div>
        ) : activeTab === "deck" ? (
          <div className="lobby-placeholder">
            <Eyebrow>Arsenal<EyebrowRule />Tactical Deck Builder</Eyebrow>
            <h1>Construct<br /><em>Your Deck</em></h1>
            <Lede wide>Assemble powerful champion combinations and forge the ultimate tactical deck for the Prism Arena.</Lede>
            <div className="lobby-queue">
              <div className="queue-copy"><small>Deck Builder</small><strong>Custom Arsenal</strong></div>
              <div className="queue-elo"><small>STATUS</small><strong>READY</strong></div>
              <Button className="lobby-cta" variant="primary" size="md" icon={<Layers3 size={20} />} onClick={() => { playSfx("click"); router.push("/deck-builder"); }}>
                Open Deck Builder
              </Button>
            </div>
          </div>
        ) : activeTab === "collection" ? (
          <div className="lobby-placeholder">
            <Eyebrow>Vault<EyebrowRule />Card Archive</Eyebrow>
            <h1>Card<br /><em>Collection</em></h1>
            <Lede wide>Inspect your unlocked units, spells, and prismatic cosmetics across all operative factions.</Lede>
            <div className="lobby-queue">
              <div className="queue-copy"><small>Vault Archive</small><strong>All Operatives</strong></div>
              <div className="queue-elo"><small>RARITY</small><strong>PRISMATIC</strong></div>
              <Button className="lobby-cta" variant="primary" size="md" icon={<BookOpen size={20} />} onClick={() => { playSfx("click"); router.push("/gallery"); }}>
                View Collection
              </Button>
            </div>
          </div>
        ) : activeTab === "rank global" ? (
          <div className="lobby-placeholder">
            <Eyebrow>Global Circuit<EyebrowRule />Operative Standings</Eyebrow>
            <h1>Competitive<br /><em>Rankings</em></h1>
            <Lede wide>Track your global circuit position and see how your rating measures up against every active operative.</Lede>
            <div className="lobby-queue">
              <div className="queue-copy"><small>Your Standing</small><strong>{currentRank ? `#${currentRank}` : "Unranked"}</strong></div>
              <div className="queue-elo"><small>YOUR ELO</small><strong>{elo.toLocaleString()}</strong></div>
              <Button className="lobby-cta" variant="primary" size="md" icon={<Trophy size={20} />} onClick={() => { playSfx("click"); router.push("/rank"); }}>
                View Leaderboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="lobby-placeholder">
            <Eyebrow>Combat Archives<EyebrowRule />Battle Records</Eyebrow>
            <h1>Match<br /><em>History</em></h1>
            <Lede wide>Review recent combat encounters, replay logs, victory percentages, and operative combat data.</Lede>
            <div className="lobby-queue">
              <div className="queue-copy"><small>Combat Record</small><strong>{wins}W - {losses}L</strong></div>
              <div className="queue-elo"><small>WIN RATE</small><strong>{winRate}%</strong></div>
              <Button className="lobby-cta" variant="primary" size="md" icon={<History size={20} />} onClick={() => { playSfx("click"); router.push("/history"); }}>
                View Battle Logs
              </Button>
            </div>
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
