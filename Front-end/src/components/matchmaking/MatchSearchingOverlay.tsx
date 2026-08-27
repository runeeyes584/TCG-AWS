"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertOctagon, Compass, Disc3, Radio, X } from "lucide-react";
import { PhaserSearchingVortex } from "./PhaserSearchingVortex";

interface MatchSearchingOverlayProps {
  queueTime: number;
  onCancel: () => void;
}

const searchingPhrases = [
  "PROBING ABYSSAL SECTORS...",
  "LOCKING QUANTUM WAVEFORM...",
  "INTERCEPTING RIVAL SIGNALS...",
  "COMMUNING WITH VOID NODES...",
  "ANALYZING COMBAT SIGNATURES...",
  "SYNCING MULTIVERSE CIRCUIT...",
];

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function MatchSearchingOverlay({
  queueTime,
  onCancel,
}: MatchSearchingOverlayProps) {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % searchingPhrases.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      className="match-searching-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      aria-label="Matchmaking in progress"
    >
      {/* Abyssal Sinkhole Background Shading & Vortex Canvas */}
      <div className="searching-vignette" aria-hidden="true" />
      <div className="searching-art" aria-hidden="true">
        <PhaserSearchingVortex />
      </div>
      <div className="searching-grid-ambient" aria-hidden="true" />

      {/* Central Tactical Telemetry Scope */}
      <div className="searching-content">
        <motion.div
          className="searching-radar-hud"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {/* Outer rotating scanner ring */}
          <div className="radar-ring-spin-cw" aria-hidden="true" />
          <div className="radar-ring-spin-ccw" aria-hidden="true" />

          <div className="radar-core-telemetry">
            <div className="radar-icon-pulse">
              <Disc3 size={32} className="radar-spinner" />
            </div>

            <div className="radar-timer-block">
              <span className="radar-timer-label">SEARCH DURATION</span>
              <strong className="radar-timer-val">{formatTime(queueTime)}</strong>
            </div>

            <div className="radar-status-pill">
              <span className="status-ping" />
              <span className="status-phrase">{searchingPhrases[phraseIndex]}</span>
            </div>
          </div>
        </motion.div>

        {/* Ambient telemetry indicators */}
        <div className="searching-telemetry-row">
          <div className="telemetry-chip">
            <Radio size={13} className="text-cyan" />
            <span>CHANNEL: SECURE // ELO MATCH 1.0</span>
          </div>
          <div className="telemetry-chip">
            <Compass size={13} className="text-purple" />
            <span>LATENCY: OPTIMAL (&lt; 25ms)</span>
          </div>
        </div>

        {/* Emergency Abort Button */}
        <motion.button
          type="button"
          className="abort-search-btn"
          onClick={onCancel}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          aria-label="Cancel matchmaking search"
        >
          <div className="abort-btn-hazard-lines" aria-hidden="true" />
          <X size={18} />
          <span>ABORT SEARCH SEQUENCE</span>
          <AlertOctagon size={16} />
        </motion.button>
      </div>
    </motion.div>
  );
}
