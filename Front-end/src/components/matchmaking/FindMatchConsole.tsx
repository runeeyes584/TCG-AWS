"use client";

import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Flame, Radio, Search, ShieldAlert, Swords, Zap } from "lucide-react";
import { MatchAvatarFrame } from "./MatchAvatarFrame";
import { ConsolePhaserBackground } from "./ConsolePhaserBackground";
import { BiometricHeartbeatMonitor } from "./BiometricHeartbeatMonitor";
import { getCachedProfile } from "../../libs/profileCache";
import type { PlayerProfile } from "../../libs/api";

interface GladiatorDossierCardProps {
  profile?: PlayerProfile;
  statusText?: string;
  className?: string;
}

export const GladiatorDossierCard = memo(function GladiatorDossierCard({
  profile,
  statusText = "CIRCUIT READY",
  className = "",
}: GladiatorDossierCardProps) {
  const activeProfile = profile ?? (getCachedProfile() as PlayerProfile | null) ?? undefined;
  const playerName = activeProfile?.username ?? "Prism Operative";
  const elo = activeProfile?.elo?.toLocaleString() ?? "1,200";
  const totalGames = (activeProfile?.wins ?? 0) + (activeProfile?.losses ?? 0);
  const winRate =
    totalGames > 0 ? Math.round(((activeProfile?.wins ?? 0) / totalGames) * 100) : 0;

  return (
    <motion.div
      className={`gladiator-dossier-card ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      aria-label="Gladiator Dossier and Rank Telemetry"
    >
      {/* Dynamic Mechanical Micro-Circuits Background (2D Hardware-Accelerated Canvas) */}
      <ConsolePhaserBackground />

      <div className="card-hazard-line" aria-hidden="true" />
      <div className="card-corner top-left" aria-hidden="true" />
      <div className="card-corner top-right" aria-hidden="true" />
      <div className="card-corner bottom-left" aria-hidden="true" />
      <div className="card-corner bottom-right" aria-hidden="true" />

      {/* Telemetry status bar */}
      <div className="dossier-telemetry-header">
        <div className="telemetry-pill danger-pulse">
          <ShieldAlert size={13} className="text-crimson" />
          <span>THREAT LEVEL: CRITICAL</span>
        </div>
        <div className="telemetry-divider" />
        <div className="telemetry-pill">
          <Radio size={12} className="text-cyan" />
          <span>CIRCUIT LINK: ACTIVE</span>
        </div>
        <div className="telemetry-spacer" />
        <span className="telemetry-region-badge">GLOBAL // SEA</span>
      </div>

      {/* Player Header Row with 5-Layer Phaser VFX Avatar */}
      <div className="dossier-player-row">
        <div className="dossier-avatar-wrap">
          <MatchAvatarFrame
            avatarUrl={activeProfile?.avatar}
            name={playerName}
            size="lg"
            theme="cyan"
          />
        </div>

        <div className="dossier-info-col">
          <div className="dossier-badge-row">
            <span className="player-rank-badge">
              <Zap size={12} /> Vanguard Tier I
            </span>
          </div>
          <h2 className="dossier-callsign" title={playerName}>
            {playerName}
          </h2>
          <p className="dossier-status-text">
            <span className="status-live-dot" /> {statusText}
          </p>
        </div>
      </div>

      {/* Combat Metrics Grid */}
      <div className="dossier-metrics-grid">
        <div className="metric-cell elo-cell">
          <span className="metric-cell-label">Combat ELO</span>
          <div className="metric-cell-value-wrap">
            <strong className="metric-cell-val text-gold">{elo}</strong>
            <Swords size={14} className="metric-cell-icon text-gold" />
          </div>
        </div>

        <div className="metric-cell">
          <span className="metric-cell-label">Win Rate</span>
          <div className="metric-cell-value-wrap">
            <strong className="metric-cell-val">{winRate}%</strong>
          </div>
          <div className="metric-progress-track">
            <div className="metric-progress-fill" style={{ width: `${winRate}%` }} />
          </div>
        </div>

        <div className="metric-cell">
          <span className="metric-cell-label">Record</span>
          <div className="metric-cell-value-wrap">
            <strong className="metric-cell-val">
              {activeProfile ? `${activeProfile.wins ?? 0}W - ${activeProfile.losses ?? 0}L` : "--"}
            </strong>
          </div>
          <span className="metric-cell-sub">Ranked matches</span>
        </div>
      </div>
    </motion.div>
  );
});

interface MatchmakingActionBarProps {
  disabled?: boolean;
  onStartSearch: () => void;
  errorText?: string;
  className?: string;
}

export const MatchmakingActionBar = memo(function MatchmakingActionBar({
  disabled = false,
  onStartSearch,
  errorText,
  className = "",
}: MatchmakingActionBarProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`matchmaking-action-bar-card ${className}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 }}
    >
      {/* Realtime Biometric & Neural Sync ECG Monitor */}
      <BiometricHeartbeatMonitor isDanger={isHovered} />

      {errorText ? (
        <p className="action-bar-error" role="alert">
          {errorText}
        </p>
      ) : null}

      {/* Main Engage Button with 0.5s Red Flame Transition and Heartbeat */}
      <button
        type="button"
        className={`engage-matchmaking-cta ${isHovered ? "is-hovered-fire" : ""}`}
        onClick={onStartSearch}
        disabled={disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Find match in ranked circuit"
      >
        <div className="cta-ambient-glow" />
        <div className="cta-fire-particles" aria-hidden="true">
          <span className="flame-ember ember-1" />
          <span className="flame-ember ember-2" />
          <span className="flame-ember ember-3" />
          <span className="flame-ember ember-4" />
        </div>

        <div className="cta-content">
          <Search size={20} className="cta-search-icon" />
          <div className="cta-text-wrap">
            <strong>{disabled ? "SYNCHRONIZING..." : "FIND MATCH"}</strong>
            <small>ENTER THE RANKED CIRCUIT</small>
          </div>
          <Flame size={20} className="cta-flame-icon" />
        </div>
        <div className="cta-flare-beam" />
      </button>
    </motion.div>
  );
});

interface FindMatchConsoleProps {
  profile?: PlayerProfile;
  disabled?: boolean;
  onStartSearch: () => void;
  statusText?: string;
  errorText?: string;
}

export const FindMatchConsole = memo(function FindMatchConsole({
  profile,
  disabled = false,
  onStartSearch,
  statusText = "CIRCUIT READY",
  errorText,
}: FindMatchConsoleProps) {
  return (
    <div className="find-match-console-container">
      <GladiatorDossierCard profile={profile} statusText={statusText} />
      <MatchmakingActionBar
        disabled={disabled}
        onStartSearch={onStartSearch}
        errorText={errorText}
      />
    </div>
  );
});
