"use client";

import { useEffect, useState } from "react";
import { Mail, Trophy, Shield, Swords, Camera, ArrowLeft } from "lucide-react";
import { updateAvatar, getCurrentUser, updateUsername } from "../../libs/api";

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

export default function UserPage() {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editingName, setEditingName] = useState(false);
    const [username, setUsername] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    useEffect(() => {
        document.body.style.overflow = "auto";

        return () => {
            document.body.style.overflow = "hidden";
        };
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
        const response = await updateUsername(username);

        if (response.success) {
            setUser(response.user);
            setEditingName(false);
        } else {
            alert(response.message);
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
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext("2d")!;
                ctx.drawImage(img, 0, 0, width, height);

                resolve(
                    canvas.toDataURL("image/jpeg", 0.7)
                );
            };

            img.src = URL.createObjectURL(file);
        });
    }

    async function handleAvatarChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file = event.target.files?.[0];
        if (!file) return;

        const base64 = await compressImage(file);

        const response = await updateAvatar(base64);

        if (response.success) {
            setUser(response.user);
        }
    }

    if (loading) {
        return (
            <main className="user-page">
                <p>Loading...</p>
            </main>
        );
    }

    if (!user) {
        return (
            <main className="user-page">
                <p>Unable to load profile.</p>
            </main>
        );
    }

    const elo = user.leaderboard_elo ?? user.stats.elo ?? 1000;
    const wins = user.leaderboard_wins ?? user.stats.wins ?? 0;
    const losses = user.leaderboard_losses ?? user.stats.losses ?? 0;

    const games = wins + losses;
    const winRate =
        games === 0 ? 0 : Math.round((wins / games) * 100);

    return (
        <main className="user-page">
            <button className="gallery-back" onClick={() => window.location.assign("/")} aria-label="Return to lobby">
                <ArrowLeft size={18} /> Lobby
            </button>
            <section className="user-card">
                <div className="profile-header">

                    <div className="user-avatar">
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} />
                        ) : (
                            <span>{user.username[0].toUpperCase()}</span>
                        )}

                        <label className="change-avatar">
                            <Camera size={18} />

                            <input
                                hidden
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                onChange={handleAvatarChange}
                            />
                        </label>
                    </div>

                    <div className="profile-info">

                        {editingName ? (
                            <div className="edit-row">

                                <input
                                    className="username-input"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    maxLength={20}
                                />

                                <button
                                    className="profile-btn save"
                                    onClick={handleSaveUsername}
                                >
                                    Save
                                </button>

                                <button
                                    className="profile-btn cancel"
                                    onClick={() => {
                                        setUsername(user.username);
                                        setEditingName(false);
                                    }}
                                >
                                    Cancel
                                </button>

                            </div>
                        ) : (
                            <div className="name-row">
                                <h1>{user.username}</h1>

                                <button
                                    className="profile-btn"
                                    onClick={() => setEditingName(true)}
                                >
                                    Edit
                                </button>
                            </div>
                        )}

                        <div className="profile-meta">
                            <div className="meta-card">
                                <Mail size={16} />
                                <div>
                                    <small>Email</small>
                                    <span>{user.email}</span>
                                </div>
                            </div>

                            <div className="meta-card rank">
                                <Trophy size={18} />
                                <div>
                                    <small>Global Rank</small>
                                    <span>{user.rank ? `#${user.rank}` : "--"}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            <section className="stats-grid">
                <div className="stat-card">
                    <Shield size={20} />
                    <h3>ELO</h3>
                    <strong>{elo.toLocaleString()}</strong>
                </div>

                <div className="stat-card">
                    <Swords size={20} />
                    <h3>Wins</h3>
                    <strong>{wins}</strong>
                </div>

                <div className="stat-card">
                    <Swords size={20} />
                    <h3>Losses</h3>
                    <strong>{losses}</strong>
                </div>

                <div className="stat-card">
                    <Trophy size={20} />
                    <h3>Win Rate</h3>
                    <strong>{winRate}%</strong>
                </div>
            </section>

            <section className="account-info">
                <h2>Account Information</h2>

                <div className="info-row">
                    <span>Email</span>
                    <strong>{user.email}</strong>
                </div>

                <div className="info-row">
                    <span>Created</span>
                    <strong>
                        {new Date(user.created_at).toLocaleDateString()}
                    </strong>
                </div>

                <div className="info-row">
                    <span>Leaderboard</span>
                    <strong>{user.leaderboard_scope ?? "GLOBAL"}</strong>
                </div>
            </section>
        </main>
    );
}