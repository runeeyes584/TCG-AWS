"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertTriangle, ArrowLeft, Camera, Check, CheckCircle2, Edit3, Mail, Shield, Swords, Trophy, UserCheck, X, Zap, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/lobby/AuthGuard";
import { UserProfilePhaserEffects } from "../../components/user/UserProfilePhaserEffects";
import { deleteAccount, getCurrentUser, updateAvatar, updateUsername } from "../../libs/api";
import { getCachedProfile, setCachedProfile, clearCachedProfile } from "../../libs/profileCache";

interface UserProfile {
  user_id: string;
  username: string;
  email: string;
  avatar_url?: string;
  stats: {
    elo: number;
    wins: number;
    losses: number;
    gamesPlayed?: number;
    winRate?: number;
  };
  created_at: string;
  rank?: number;
  rank_updated_at?: number;
  leaderboard_scope?: "GLOBAL";
  leaderboard_sort?: string;
  leaderboard_elo?: number;
  leaderboard_win_rate?: number;
  leaderboard_wins?: number;
  leaderboard_losses?: number;
  lastNameChangedAt?: number;
}

interface ToastNotification {
  type: "success" | "error";
  title: string;
  message: string;
}

function normalizeProfile(value: unknown): UserProfile | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<UserProfile> & { id?: unknown };
  const userId = typeof candidate.user_id === "string"
    ? candidate.user_id
    : typeof candidate.id === "string"
      ? candidate.id
      : "";
  if (!userId || typeof candidate.username !== "string" || typeof candidate.email !== "string") return null;
  return { ...candidate, user_id: userId } as UserProfile;
}

function UserPageContent() {
  const router = useRouter();
  const cached = getCachedProfile();
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (!cached) return null;
    return {
      user_id: cached.id,
      username: cached.username,
      email: cached.email,
      avatar_url: cached.avatar,
      stats: {
        elo: cached.elo,
        wins: cached.wins,
        losses: cached.losses,
        gamesPlayed: cached.wins + cached.losses,
        winRate: (cached.wins + cached.losses > 0) ? Math.round((cached.wins / (cached.wins + cached.losses)) * 100) : 0,
      },
      created_at: new Date(cached.updatedAt || Date.now()).toISOString(),
      leaderboard_elo: cached.elo,
      leaderboard_wins: cached.wins,
      leaderboard_losses: cached.losses,
    };
  });
  const [loading, setLoading] = useState(() => !cached);
  const [editingName, setEditingName] = useState(false);
  const [username, setUsername] = useState(() => cached?.username || "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<ToastNotification | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function loadProfile() {
    try {
      const response = await getCurrentUser();
      if (response.success) {
        const profile = normalizeProfile(response.user);
        if (!profile) throw new Error("The backend returned an invalid user profile.");
        setUser(profile);
        setUsername(profile.username);
        setCachedProfile({
          id: profile.user_id,
          username: profile.username,
          email: profile.email,
          avatar: profile.avatar_url,
          elo: profile.leaderboard_elo ?? profile.stats?.elo ?? 1200,
          wins: profile.leaderboard_wins ?? profile.stats?.wins ?? 0,
          losses: profile.leaderboard_losses ?? profile.stats?.losses ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUsername() {
    if (!username.trim() || username === user?.username) {
      setEditingName(false);
      return;
    }
    setSavingName(true);
    try {
      const response = await updateUsername(username);
      if (response.success) {
        const profile = normalizeProfile(response.user);
        if (!profile) throw new Error("The backend returned an invalid updated profile.");
        setUser(profile);
        setEditingName(false);
        setCachedProfile({ username: profile.username });
        setToast({
          type: "success",
          title: "CALLSIGN UPDATED",
          message: `Operative callsign updated to "${profile.username}". Next change available in 30 days.`
        });
      } else {
        setToast({
          type: "error",
          title: "UPDATE RESTRICTED",
          message: response.message || "Failed to update username."
        });
      }
    } catch (error) {
      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: string }).code
        : undefined;
      setToast({
        type: "error",
        title: errorCode === "CALLSIGN_TAKEN" ? "CALLSIGN ALREADY IN USE" : "CALLSIGN CHANGE RESTRICTED",
        message: error instanceof Error ? error.message : "The callsign could not be updated."
      });
    } finally {
      setSavingName(false);
    }
  }

  async function compressImage(file: File): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_SIZE = 256;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const base64 = await compressImage(file);
      const response = await updateAvatar(base64);
      if (response.success) {
        setUser(response.user);
        setCachedProfile({ avatar: response.user?.avatar_url || base64 });
      } else {
        alert(response.message || "Failed to update avatar");
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await deleteAccount();
      clearCachedProfile();
      localStorage.clear();
      sessionStorage.clear();
      router.replace("/login?deleted=1");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to delete account.");
      setDeleting(false);
    }
  }

  if (loading) {
    return <UserPageLoadingGate />;
  }

  if (!user) {
    return (
      <main className="user-page-shell">
        <div className="user-page-grid" aria-hidden="true" />
        <div className="user-page-vignette" aria-hidden="true" />
        <div className="user-page-loading">
          <p>Unable to load user profile.</p>
          <button className="user-page-back" onClick={() => router.push("/")}>
            <ArrowLeft size={16} /> Return to Lobby
          </button>
        </div>
      </main>
    );
  }

  const elo = user.leaderboard_elo ?? user.stats?.elo ?? 1000;
  const wins = user.leaderboard_wins ?? user.stats?.wins ?? 0;
  const losses = user.leaderboard_losses ?? user.stats?.losses ?? 0;
  const games = wins + losses;
  const winRate = games === 0 ? 0 : Math.round((wins / games) * 100);

  const getTier = (points: number) => {
    if (points >= 2000) return { title: "CHRONO GRANDMASTER", color: "#ffd700", icon: "👑" };
    if (points >= 1600) return { title: "DIAMOND CIRCUIT", color: "#b870ff", icon: "💎" };
    if (points >= 1300) return { title: "GOLD COMBATANT", color: "#ffb700", icon: "🥇" };
    if (points >= 1100) return { title: "SILVER DUELIST", color: "#a8c0d8", icon: "🥈" };
    return { title: "BRONZE ROOKIE", color: "#cd7f32", icon: "🥉" };
  };
  const tier = getTier(elo);
  const eloProgress = Math.min(100, Math.max(8, Math.round((elo / 2200) * 100)));
  const usernameChangeDate = user.lastNameChangedAt
    ? user.lastNameChangedAt + 30 * 24 * 60 * 60 * 1000
    : Date.now() + 30 * 24 * 60 * 60 * 1000;
  const formatDate = (timestamp: number) => new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit"
  }).format(new Date(timestamp));

  return (
    <main className="user-page-shell">
      <AnimatePresence>
        {toast && (
          <motion.div
            key="top-toast"
            initial={{ opacity: 0, y: -60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`profile-toast profile-toast--${toast.type}`}
          >
            <div className="profile-toast__icon">
              {toast.type === "success" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="profile-toast__content">
              <strong>
                {toast.title}
              </strong>
              <p>
                {toast.message}
              </p>
            </div>
            <button className="profile-toast__close" onClick={() => setToast(null)} aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="user-page-art" aria-hidden="true">
        <UserProfilePhaserEffects />
      </div>
      <div className="user-page-grid" aria-hidden="true" />
      <div className="user-page-vignette" aria-hidden="true" />
      <div className="user-page-scanline" aria-hidden="true" />

      <motion.header
        className="user-page-header"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="user-page-back" onClick={() => router.push("/")}>
          <ArrowLeft size={17} /> Lobby
        </button>
        <div className="user-page-brand">
          <span><UserCheck size={18} /></span>
          <div>
            <strong>Chrono Genesis</strong>
            <small>Player dossier & Identity</small>
          </div>
        </div>
        <div className="user-page-status">
          <span className="user-live-status"><i /> System online</span>
          <span className="tier-badge" style={{ borderColor: tier.color, color: tier.color }}>
            {tier.icon} {tier.title}
          </span>
        </div>
      </motion.header>

      <motion.section
        className="user-page-intro"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.08 }}
      >
        <p><Shield size={14} /> Identity Record <i /> Season 01 <i /> ID {user.user_id.slice(0, 8)}</p>
        <div className="user-page-heading-row">
          <div>
            <h1>Player <em>Profile</em></h1>
            <span>
              Manage your personal credentials, customize avatar portrait and analyze performance metrics
            </span>
          </div>
        </div>
      </motion.section>

      <motion.div
        className="user-page-board"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.45 }}
      >
        <div className="user-identity-card">
          <div className="identity-card-index" aria-hidden="true">CG // 01</div>
          <div className="user-avatar-wrapper">
            <div className="avatar-energy-ring" aria-hidden="true" />
            <div className="user-avatar-frame">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.username} />
              ) : (
                <span className="avatar-initial">{user.username[0]?.toUpperCase()}</span>
              )}
            </div>
            <label className="change-avatar-btn" title="Change Avatar">
              <Camera size={16} />
              <input
                hidden
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleAvatarChange}
                disabled={uploadingAvatar}
              />
            </label>
          </div>

          <div className="user-identity-info">
            <span className="identity-eyebrow">Authenticated player identity</span>
            <div className="username-display-box">
              <h2>{user.username}</h2>
              <button className="user-btn edit" onClick={() => { setUsername(user.username); setEditingName(true); }}>
                <Edit3 size={14} /> Edit Name
              </button>
            </div>

            <div className="user-meta-pills">
              <div className="user-meta-pill">
                <Mail size={14} />
                <span>{user.email}</span>
              </div>
              <div className="user-meta-pill highlight">
                <Trophy size={14} />
                <span>Global Rank: {user.rank ? `#${user.rank}` : "Unranked"}</span>
              </div>
            </div>
            <div className="user-power-track">
              <div className="power-track-copy">
                <span><Activity size={13} /> Combat power sync</span>
                <strong>{eloProgress}%</strong>
              </div>
              <div className="power-track-rail">
                <motion.i
                  initial={{ width: 0 }}
                  animate={{ width: `${eloProgress}%` }}
                  transition={{ delay: 0.5, duration: 0.9, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="user-stats-grid">
          <motion.div className="user-stat-card elo-card" whileHover={{ y: -4 }}>
            <div className="stat-card-header">
              <Shield size={18} />
              <span>Combat Rating</span>
            </div>
            <strong className="stat-card-value">{elo.toLocaleString()}</strong>
            <small className="stat-card-sub">ELO Points</small>
            <span className="stat-card-code">CR-01</span>
          </motion.div>

          <motion.div className="user-stat-card win-card" whileHover={{ y: -4 }}>
            <div className="stat-card-header">
              <Swords size={18} />
              <span>Victories</span>
            </div>
            <strong className="stat-card-value text-win">{wins}</strong>
            <small className="stat-card-sub">Matches Won</small>
            <span className="stat-card-code">VX-02</span>
          </motion.div>

          <motion.div className="user-stat-card loss-card" whileHover={{ y: -4 }}>
            <div className="stat-card-header">
              <Swords size={18} />
              <span>Defeats</span>
            </div>
            <strong className="stat-card-value text-loss">{losses}</strong>
            <small className="stat-card-sub">Matches Lost</small>
            <span className="stat-card-code">DX-03</span>
          </motion.div>

          <motion.div className="user-stat-card rate-card" whileHover={{ y: -4 }}>
            <div className="stat-card-header">
              <Zap size={18} />
              <span>Win Ratio</span>
            </div>
            <strong className="stat-card-value">{winRate}%</strong>
            <small className="stat-card-sub">{games} Total Duels</small>
            <span className="stat-card-code">WR-04</span>
          </motion.div>
        </div>

        <div className="user-details-panel">
          <div className="details-panel-heading">
            <div>
              <span>Secure archive</span>
              <h3>Account Dossier</h3>
            </div>
            <Shield size={20} />
          </div>
          <div className="details-grid">
            <div className="detail-row">
              <span className="detail-label">Email Address</span>
              <strong className="detail-value">{user.email}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Circuit Membership Since</span>
              <strong className="detail-value">
                {new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">Leaderboard Scope</span>
              <strong className="detail-value">{user.leaderboard_scope ?? "GLOBAL CIRCUIT"}</strong>
            </div>
            <div className="detail-row">
              <span className="detail-label">System Clearance</span>
              <strong className="detail-value text-gold">AUTHENTICATED DUELIST</strong>
            </div>
          </div>
        </div>
      </motion.div>
      <AnimatePresence>
        {editingName && (
          <motion.div
            className="username-edit-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="username-edit-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="username-edit-modal"
              initial={{ opacity: 0, y: -24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
            >
              <div className="username-edit-modal__eyebrow"><Shield size={14} /> IDENTITY CONTROL</div>
              <h2 id="username-edit-title">EDIT OPERATIVE CALLSIGN</h2>
              <p className="username-edit-modal__warning">
                You have one callsign change every 30 days. {user.lastNameChangedAt
                  ? `Your next change is available on ${formatDate(usernameChangeDate)}.`
                  : `If you save this change now, your next change will be available on ${formatDate(usernameChangeDate)}.`}
              </p>
              <label className="username-edit-modal__field">
                <span>New callsign</span>
                <input
                  className="username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
              </label>
              <p className="username-edit-modal__hint">Use 3–20 letters, numbers, or underscores. The name must be unique.</p>
              <div className="username-edit-modal__actions">
                <button
                  className="user-btn cancel"
                  onClick={() => { setUsername(user.username); setEditingName(false); }}
                  disabled={savingName}
                >
                  <X size={14} /> Cancel
                </button>
                <button className="user-btn save" onClick={handleSaveUsername} disabled={savingName}>
                  <Check size={14} /> {savingName ? "Saving..." : "Save changes"}
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="user-account-actions">
        <button className="user-delete-account" onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={15} /> Delete Account
        </button>
      </div>
      {showDeleteModal && (
        <div className="account-delete-overlay" role="dialog" aria-modal="true">
          <section className="account-delete-modal">
            <h2>TERMINATE OPERATIVE PROFILE</h2>
            <p>This action is permanent. Your profile, stats, decks, and account data will be deleted. The email address will be unavailable for 24 hours.</p>
            <div className="account-delete-actions">
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}>CANCEL</button>
              <button className="confirm-delete" onClick={handleDeleteAccount} disabled={deleting}>{deleting ? "DELETING..." : "CONFIRM DELETION"}</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function UserPageLoadingGate() {
  return (
    <main className="user-page-shell">
      <div className="user-page-grid" aria-hidden="true" />
      <div className="user-page-vignette" aria-hidden="true" />
      <div className="user-page-loading">
        <div className="user-page-spinner" />
        <p>Accessing Player Dossier...</p>
      </div>
    </main>
  );
}

export default function UserPage() {
  return (
    <AuthGuard loadingComponent={<UserPageLoadingGate />}>
      <UserPageContent />
    </AuthGuard>
  );
}
