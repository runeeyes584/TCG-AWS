"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Crown,
  Medal,
  ShieldCheck,
  Trophy
} from "lucide-react";
import {
  type LeaderboardPlayer
} from "../../libs/api";
import { LeaderboardPhaserEffects } from "./LeaderboardPhaserEffects";

const podiumOrder = [2, 1, 3];

interface Props {
  isSignedIn: boolean;
  onSignIn: () => void;
  entries: LeaderboardPlayer[];
  loading: boolean;
  loadingMore: boolean;
  error?: string;
  hasMore: boolean;
  onRefresh: () => void;
  onLoadMore: () => void;
}

function formatWinRate(player: LeaderboardPlayer) {
  return `${(player.winRate * 100).toFixed(1)}%`;
}

function avatar(player: LeaderboardPlayer) {
  return (
    <>
      <span>{player.username.slice(0, 2).toUpperCase()}</span>
      {player.avatar ? (
      <img
        src={player.avatar}
        alt=""
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      ) : null}
    </>
  );
}

function PodiumCard({ player, rank }: { player: LeaderboardPlayer; rank: number }) {
  return (
    <motion.article
      className={`leaderboard-podium-card leaderboard-podium-card--${rank}`}
      initial={{ opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18, delay: rank === 1 ? 0.05 : rank * 0.08 }}
    >
      <div className="leaderboard-podium-card__rank">
        {rank === 1 ? <Crown size={24} /> : <Medal size={21} />}
        <strong>#{rank}</strong>
      </div>
      <div className="leaderboard-podium-card__avatar">{avatar(player)}</div>
      <strong className="leaderboard-podium-card__name">{player.username}</strong>
      <span className="leaderboard-podium-card__elo">{Math.round(player.elo).toLocaleString()} ELO</span>
      <div className="leaderboard-podium-card__record">
        <span>{formatWinRate(player)} WR</span>
        <span>{player.wins}W · {player.losses}L</span>
      </div>
      {rank === 1 ? <span className="leaderboard-podium-card__champion">PRISM CHAMPION</span> : null}
    </motion.article>
  );
}

function RankingRow({ player, position }: { player: LeaderboardPlayer; position: number }) {
  return (
    <motion.article
      layout
      className={`leaderboard-row ${player.isCurrentPlayer ? "is-current" : ""}`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
    >
      <strong className="leaderboard-row__rank">#{position}</strong>
      <div className="leaderboard-row__avatar">{avatar(player)}</div>
      <div className="leaderboard-row__identity">
        <strong>{player.username}</strong>
        <small>{player.isCurrentPlayer ? "Your standing" : "Global operative"}</small>
      </div>
      <span><small>ELO</small><b>{Math.round(player.elo).toLocaleString()}</b></span>
      <span><small>WIN RATE</small><b>{formatWinRate(player)}</b></span>
      <span className="leaderboard-row__record">{player.wins}W · {player.losses}L</span>
      {player.rankPending ? <i>Updating</i> : null}
    </motion.article>
  );
}

export function LeaderboardPanel({
  isSignedIn,
  onSignIn,
  entries,
  loading,
  loadingMore,
  error,
  hasMore,
  onRefresh,
  onLoadMore
}: Props) {
  // The GSI query is already the live source of ranking order. Stored `rank`
  // can trail it until the scheduled rebuild, so podium placement uses position.
  const podiumPlayers = useMemo(() => podiumOrder
    .map((rank) => {
      const player = entries[rank - 1];
      return player ? { player, rank } : null;
    })
    .filter((item): item is { player: LeaderboardPlayer; rank: number } => Boolean(item)), [entries]);
  const remainingPlayers = entries.slice(3);
  if (!isSignedIn) {
    return (
      <div className="rank-leaderboard-locked">
        <Trophy size={38} />
        <p className="lobby-eyebrow">Global Circuit <span /></p>
        <h1>Claim your<br /><em>World Rank</em></h1>
        <p className="lobby-lede">Sign in to view the global standings and track your position among every operative.</p>
        <button className="queue-action queue-action--small" onClick={onSignIn}>
          <ShieldCheck size={18} /> Sign in to view ranks
        </button>
      </div>
    );
  }

  return (
    <section className="rank-leaderboard-content" aria-label="Global leaderboard">
      {error ? (
        <div className="leaderboard-state leaderboard-state--error">
          <p>{error}</p>
          <button onClick={onRefresh}>Try again</button>
        </div>
      ) : loading ? (
        <div className="leaderboard-state" aria-label="Loading leaderboard">
          <span /><span /><span />
        </div>
      ) : entries.length ? (
        <>
          <div className="leaderboard-podium">
            <LeaderboardPhaserEffects />
            <AnimatePresence>
              {podiumPlayers.map(({ player, rank }) => (
                <PodiumCard key={player.userId} player={player} rank={rank} />
              ))}
            </AnimatePresence>
          </div>
          <div className="leaderboard-list" role="feed">
            <AnimatePresence initial={false}>
              {remainingPlayers.map((player, index) => (
                <RankingRow key={player.userId} player={player} position={index + 4} />
              ))}
            </AnimatePresence>
            {hasMore ? (
              <button
                className="leaderboard-load-more"
                disabled={loadingMore}
                onClick={onLoadMore}
              >
                {loadingMore ? "Loading…" : "Load more operatives"}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <div className="leaderboard-state">The circuit is waiting for its first scheduled rank build.</div>
      )}
    </section>
  );
}
