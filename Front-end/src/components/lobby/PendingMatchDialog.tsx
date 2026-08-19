"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Radio, Swords, Play, LogOut, RotateCcw } from "lucide-react";

interface PendingMatchDialogProps {
  status: "WAITING" | "IN_PROGRESS";
  isResolving?: boolean;
  isContinuing?: boolean;
  onContinue: () => void;
  onForfeit: () => void;
}

export function PendingMatchDialog({
  status,
  isResolving = false,
  isContinuing = false,
  onContinue,
  onForfeit,
}: PendingMatchDialogProps) {
  const isQueue = status === "WAITING";

  return (
    <ModalPortal>
      <div
        className="pending-match-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pending-match-title"
      >
        <section className="pending-match-dialog">
          {/* Cyberpunk Grid & Ambient Energy Accent */}
          <div className="pending-match-dialog__glow" aria-hidden="true" />
          <div className="pending-match-dialog__grid" aria-hidden="true" />

          {/* Header Protocol Badge */}
          <div className="pending-match-dialog__badge">
            <Radio size={13} className="pending-match-pulse-icon" />
            <span>
              {isQueue
                ? "MATCHMAKING PROTOCOL · QUEUE ACTIVE"
                : "RECONNECT PROTOCOL · BATTLEFIELD DETECTED"}
            </span>
          </div>

          {/* Central Hologram Visual Icon */}
          <div className="pending-match-dialog__visual" aria-hidden="true">
            <div className="pending-match-dialog__radar-ring" />
            <div className="pending-match-dialog__radar-core">
              {isQueue ? <Radio size={26} /> : <Swords size={26} />}
            </div>
          </div>

          {/* Title & Description */}
          <h2 id="pending-match-title" className="pending-match-dialog__title">
            {isQueue ? "Resume Matchmaking Search?" : "Active Match in Progress"}
          </h2>
          <p className="pending-match-dialog__desc">
            {isQueue
              ? "You are currently registered in the matchmaking queue. You can resume searching or cancel safely without any rating penalty."
              : "An ongoing duel is currently waiting for your connection. Reconnect immediately to resume your battlefield or surrender the match."}
          </p>

          {/* Action Buttons */}
          <div className="pending-match-dialog__actions">
            <button
              type="button"
              className="pending-match-btn pending-match-btn--forfeit"
              onClick={onForfeit}
              disabled={isResolving || isContinuing}
            >
              <LogOut size={16} />
              <span>{isResolving ? "Leaving..." : isQueue ? "Cancel Search" : "Leave Match"}</span>
            </button>
            <button
              type="button"
              className="pending-match-btn pending-match-btn--continue"
              onClick={onContinue}
              disabled={isResolving || isContinuing}
              autoFocus
            >
              {isContinuing ? (
                <>
                  <RotateCcw size={16} className="pending-match-spin-icon" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <Play size={16} />
                  <span>{isQueue ? "Continue Searching" : "Continue Match"}</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
