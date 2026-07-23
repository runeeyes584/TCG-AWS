"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Radio, RefreshCw, Sparkles, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { GalleryPhaserBackdrop } from "../../components/gallery/GalleryPhaserBackdrop";
import { LeaderboardPanel } from "../../components/rank/LeaderboardPanel";
import { useLeaderboard } from "../../hooks/useLeaderboard";

export default function RankPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const leaderboard = useLeaderboard({ enabled: authChecked && isSignedIn });

  useEffect(() => {
    setIsSignedIn(Boolean(window.localStorage.getItem("accessToken")));
    setAuthChecked(true);
  }, []);

  return (
    <main className="rank-page-shell">
      <GalleryPhaserBackdrop />
      <div className="rank-page-grid" aria-hidden="true" />
      <div className="rank-page-vignette" aria-hidden="true" />

      <motion.header
        className="rank-page-header"
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <button className="rank-page-back" onClick={() => router.push("/")}>
          <ArrowLeft size={17} /> Lobby
        </button>
        <div className="rank-page-brand">
          <span><Sparkles size={18} /></span>
          <div>
            <strong>Chrono Genesis</strong>
            <small>Global competitive circuit</small>
          </div>
        </div>
        <div className="rank-page-status">
          <Radio size={14} />
          <span>Live projection</span>
        </div>
      </motion.header>

      <motion.section
        className="rank-page-intro"
        initial={{ opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.08 }}
      >
        <p><Trophy size={14} /> Season 01 <i /> World standing</p>
        <div className="rank-page-heading-row">
          <div>
            <h1>Global <em>Leaderboard</em></h1>
            <span>
              ELO leads the order, followed by win rate and total victories · Rebuilds every 10 minutes
            </span>
          </div>
          <button
            className="leaderboard-refresh"
            onClick={() => void leaderboard.refresh()}
            disabled={!isSignedIn || leaderboard.loading}
          >
            <RefreshCw size={15} className={leaderboard.loading ? "is-spinning" : ""} />
            Refresh
          </button>
        </div>
      </motion.section>

      <motion.div
        className="rank-page-board"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.45 }}
      >
        {authChecked ? (
          <LeaderboardPanel
            isSignedIn={isSignedIn}
            onSignIn={() => router.push("/login")}
            entries={leaderboard.entries}
            loading={leaderboard.loading}
            loadingMore={leaderboard.loadingMore}
            error={leaderboard.error}
            hasMore={Boolean(leaderboard.cursor)}
            onRefresh={() => void leaderboard.refresh()}
            onLoadMore={() => void leaderboard.loadMore()}
          />
        ) : (
          <div className="leaderboard-state" aria-label="Checking authentication">
            <span /><span /><span />
          </div>
        )}
      </motion.div>

      <footer className="rank-page-footer">
        <span><i /> Ranking service online</span>
        <span>Ranks rebuild every 10 minutes</span>
      </footer>
    </main>
  );
}
