"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Camera, Check, Edit3, Mail, Shield, Swords, Trophy, UserCheck, X, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/lobby/AuthGuard";
import { PhaserSplash } from "../../components/lobby/PhaserSplash";
import { getCurrentUser, updateAvatar, updateUsername } from "../../libs/api";

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
}

function UserPageContent() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [username, setUsername] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await getCurrentUser();
      if (response.success) {
        setUser(response.user);
        setUsername(response.user.username);
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
        setUser(response.user);
        setEditingName(false);
      } else {
        alert(response.message || "Failed to update username");
      }
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
      } else {
        alert(response.message || "Failed to update avatar");
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  if (loading) {
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

  return (
    <main className="user-page-shell">
      <div className="user-page-art" aria-hidden="true"><PhaserSplash /></div>
      <div className="user-page-grid" aria-hidden="true" />
      <div className="user-page-vignette" aria-hidden="true" />

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
        <p><Shield size={14} /> Identity Record <i /> Season 01</p>
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
        {/* Main Identity Card */}
        <div className="user-identity-card">
          <div className="user-avatar-wrapper">
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
            {editingName ? (
              <div className="username-edit-box">
                <input
                  className="username-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                <button
                  className="user-btn save"
                  onClick={handleSaveUsername}
                  disabled={savingName}
                >
                  <Check size={14} /> Save
                </button>
                <button
                  className="user-btn cancel"
                  onClick={() => {
                    setUsername(user.username);
                    setEditingName(false);
                  }}
                  disabled={savingName}
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            ) : (
              <div className="username-display-box">
                <h2>{user.username}</h2>
                <button className="user-btn edit" onClick={() => setEditingName(true)}>
                  <Edit3 size={14} /> Edit Name
                </button>
              </div>
            )}

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
          </div>
        </div>

        {/* Combat Performance Stats Grid */}
        <div className="user-stats-grid">
          <div className="user-stat-card elo-card">
            <div className="stat-card-header">
              <Shield size={18} />
              <span>Combat Rating</span>
            </div>
            <strong className="stat-card-value">{elo.toLocaleString()}</strong>
            <small className="stat-card-sub">ELO Points</small>
          </div>

          <div className="user-stat-card win-card">
            <div className="stat-card-header">
              <Swords size={18} />
              <span>Victories</span>
            </div>
            <strong className="stat-card-value text-win">{wins}</strong>
            <small className="stat-card-sub">Matches Won</small>
          </div>

          <div className="user-stat-card loss-card">
            <div className="stat-card-header">
              <Swords size={18} />
              <span>Defeats</span>
            </div>
            <strong className="stat-card-value text-loss">{losses}</strong>
            <small className="stat-card-sub">Matches Lost</small>
          </div>

          <div className="user-stat-card rate-card">
            <div className="stat-card-header">
              <Zap size={18} />
              <span>Win Ratio</span>
            </div>
            <strong className="stat-card-value">{winRate}%</strong>
            <small className="stat-card-sub">{games} Total Duels</small>
          </div>
        </div>

        {/* Account Meta Section */}
        <div className="user-details-panel">
          <h3>Account Dossier</h3>
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
    </main>
  );
}

export default function UserPage() {
  return (
    <AuthGuard>
      <UserPageContent />
    </AuthGuard>
  );
}