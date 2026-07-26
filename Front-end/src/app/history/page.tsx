"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, History, MinusCircle, RefreshCw, Swords, Trophy, User, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "../../components/lobby/AuthGuard";
import { GalleryPhaserBackdrop } from "../../components/gallery/GalleryPhaserBackdrop";
import { getMatchHistory, MatchHistory } from "../../libs/api";

function HistoryPageContent() {
  const router = useRouter();
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = () => {
    setLoading(true);
    getMatchHistory()
      .then((res) => setHistory(res.history))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const totalMatches = history.length;
  const wins = history.filter((m) => m.result === "WIN").length;
  const losses = history.filter((m) => m.result === "LOSS").length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const totalEloChange = history.reduce((acc, m) => acc + (m.rank_point_change || 0), 0);

  return (
    <main className="history-page-shell">
      <GalleryPhaserBackdrop />
      <div className="history-page-grid" aria-hidden="true" />
      <div className="history-page-vignette" aria-hidden="true" />

      <motion.header
        className="history-page-header"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="history-page-back" onClick={() => router.push("/")}>
          <ArrowLeft size={17} /> Lobby
        </button>
        <div className="history-page-brand">
          <span><History size={18} /></span>
          <div>
            <strong>Chrono Genesis</strong>
            <small>Personal duel archives</small>
          </div>
        </div>
        <div className="history-page-status">
          <span>{totalMatches} Matches Recorded</span>
        </div>
      </motion.header>

      <motion.section
        className="history-page-intro"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.08 }}
      >
        <p><Swords size={14} /> Combat History <i /> Season 01</p>
        <div className="history-page-heading-row">
          <div>
            <h1>Match <em>History</em></h1>
            <span>
              Review your recent duel performances, opponent records and Rank Point fluctuations
            </span>
          </div>
          <button
            className="history-refresh"
            onClick={fetchHistory}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "is-spinning" : ""} />
            Refresh
          </button>
        </div>
      </motion.section>

      <motion.div
        className="history-page-board"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.45 }}
      >
        {/* Stats Summary Bar */}
        <div className="history-summary-bar">
          <div className="summary-stat-card">
            <small>Total Played</small>
            <strong>{totalMatches}</strong>
          </div>
          <div className="summary-stat-card">
            <small>Wins / Losses</small>
            <strong>{wins}W <span className="stat-divider">/</span> {losses}L</strong>
          </div>
          <div className="summary-stat-card">
            <small>Win Rate</small>
            <strong>{winRate}%</strong>
          </div>
          <div className="summary-stat-card">
            <small>Net RP</small>
            <strong className={totalEloChange >= 0 ? "text-win" : "text-loss"}>
              {totalEloChange >= 0 ? `+${totalEloChange}` : totalEloChange} RP
            </strong>
          </div>
        </div>

        {/* Content List */}
        {loading ? (
          <div className="history-empty-state">
            <RefreshCw size={28} className="is-spinning" />
            <p>Retrieving match logs...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="history-empty-state">
            <Swords size={32} />
            <p>No duel records found. Complete a match to view your history.</p>
          </div>
        ) : (
          <div className="history-list-scroll">
            {history.map((match) => (
              <div className={`history-item-card result-${match.result}`} key={match.match_id}>
                <div className="card-result-glow" />

                <div className="card-badge">
                  <span className="badge-icon">
                    {match.result === "WIN" && <Trophy size={15} />}
                    {match.result === "LOSS" && <XCircle size={15} />}
                    {match.result === "DRAW" && <MinusCircle size={15} />}
                  </span>
                  <span className="badge-text">{match.result}</span>
                </div>

                <div className="card-combatants">
                  <div className="player-avatar-hex">
                    {match.opponent_avatar ? (
                      <img
                        src={match.opponent_avatar}
                        alt={match.opponent_name ?? match.opponent_id}
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        <User size={16} />
                      </div>
                    )}
                  </div>
                  <div className="opponent-details">
                    <span className="vs-tag">VS OPPONENT</span>
                    <strong className="opponent-name">{match.opponent_name ?? match.opponent_id}</strong>
                  </div>
                </div>

                <div className="card-timestamp">
                  <Clock size={12} />
                  <span>
                    {new Date(match.played_at).toLocaleDateString()}{" "}
                    <small>
                      {new Date(match.played_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </small>
                  </span>
                </div>

                <div className={`card-elo-change ${match.rank_point_change >= 0 ? "is-up" : "is-down"}`}>
                  <span>{match.rank_point_change >= 0 ? "+" : ""}{match.rank_point_change}</span>
                  <small>RP</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </main>
  );
}

export default function MatchHistoryPage() {
  return (
    <AuthGuard>
      <HistoryPageContent />
    </AuthGuard>
  );
}