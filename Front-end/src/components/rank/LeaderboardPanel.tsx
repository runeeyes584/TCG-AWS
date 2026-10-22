"use client";

import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ShieldCheck,
  Trophy
} from "lucide-react";
import {
  type LeaderboardPlayer
} from "../../libs/api";
import { LeaderboardPhaserEffects } from "./LeaderboardPhaserEffects";
import { PodiumBadge } from "./PodiumBadge";
import { Eyebrow, Lede } from "../ui/layout";
import { StatusPanel } from "../ui/feedback";
import { Button } from "../ui/button";

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

const PODIUM_TITLE: Record<number, string> = { 1: "Champion", 2: "Runner-up", 3: "Third place" };

function PodiumCard({ player, rank }: { player: LeaderboardPlayer; rank: number }) {
  return (
    <motion.article
      className={`leaderboard-podium-card leaderboard-podium-card--${rank}`}
      initial={{ opacity: 0, y: 28, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 180, damping: 18, delay: rank === 1 ? 0.05 : rank * 0.08 }}
    >
      {/* Decorative layers: a moving sheen, metal corner trims and, for the champion, rising sparks. */}
      <span className="leaderboard-podium-card__shine" aria-hidden="true" />
      <span className="leaderboard-podium-card__trim leaderboard-podium-card__trim--left" aria-hidden="true" />
      <span className="leaderboard-podium-card__trim leaderboard-podium-card__trim--right" aria-hidden="true" />
      {rank === 1 ? (
        <span className="leaderboard-podium-card__sparks" aria-hidden="true">
          {Array.from({ length: 7 }, (_, index) => <i key={index} />)}
        </span>
      ) : null}
      <div className="leaderboard-podium-card__rank">
        <PodiumBadge rank={rank as 1 | 2 | 3} />
      </div>
      <span className="leaderboard-podium-card__title">{PODIUM_TITLE[rank]}</span>
      <div className="leaderboard-podium-card__avatar-wrap">
        <span className="leaderboard-podium-card__ring" aria-hidden="true" />
        <div className="leaderboard-podium-card__avatar">{avatar(player)}</div>
      </div>
      <strong className="leaderboard-podium-card__name">{player.username}</strong>
      <span className="leaderboard-podium-card__elo">{Math.round(player.elo).toLocaleString()} ELO</span>
      <div className="leaderboard-podium-card__record">
        <span>{formatWinRate(player)} WR</span>
        <span>{player.wins}W · {player.losses}L</span>
      </div>
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
        <Eyebrow line>Global Circuit</Eyebrow>
        <h1>Claim your<br /><em>World Rank</em></h1>
        <Lede>Sign in to view the global standings and track your position among every operative.</Lede>
        <Button className="rank-locked-action" variant="primary" icon={<ShieldCheck size={18} />} onClick={onSignIn}>
          Sign in to view ranks
        </Button>
      </div>
    );
  }

  return (
    <section className="rank-leaderboard-content" aria-label="Global leaderboard">
      {error ? (
        <StatusPanel
          status="error"
          className="rank-state-span"
          action={{ label: "Try again", onClick: onRefresh }}
        >
          {error}
        </StatusPanel>
      ) : loading ? (
        <StatusPanel status="loading" label="Loading leaderboard" className="rank-state-span" />
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
              <Button size="sm" fullWidth disabled={loadingMore} onClick={onLoadMore}>
                {loadingMore ? "Loading…" : "Load more operatives"}
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <StatusPanel className="rank-state-span">
          The circuit is waiting for its first scheduled rank build.
        </StatusPanel>
      )}
    </section>
  );
}
