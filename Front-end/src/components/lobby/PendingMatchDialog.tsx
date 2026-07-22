"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface PendingMatchDialogProps {
  status: "WAITING" | "IN_PROGRESS";
  isResolving?: boolean;
  onContinue: () => void;
  onForfeit: () => void;
}

export function PendingMatchDialog({ status, isResolving = false, onContinue, onForfeit }: PendingMatchDialogProps) {
  const isQueue = status === "WAITING";
  return <ModalPortal>{(
    <div className="pending-match-overlay" role="dialog" aria-modal="true" aria-labelledby="pending-match-title">
      <section className="pending-match-dialog">
        <div className="pending-match-dialog__icon" aria-hidden="true">!</div>
        <p>{isQueue ? "Matchmaking in progress" : "Match in progress"}</p>
        <h2 id="pending-match-title">{isQueue ? "Resume matchmaking?" : "Continue your active match?"}</h2>
        <span>
          {isQueue
            ? "You are still in the matchmaking queue. You can continue searching or cancel without any ELO penalty."
            : "Choose Continue Match to reconnect, or Leave Match to surrender. Leaving records a loss and applies the normal ELO change."}
        </span>
        <div className="pending-match-dialog__actions">
          <button type="button" onClick={onForfeit} disabled={isResolving}>
            {isResolving ? "Processing..." : isQueue ? "Cancel Search" : "Leave Match"}
          </button>
          <button type="button" onClick={onContinue} disabled={isResolving} autoFocus>
            {isQueue ? "Continue Searching" : "Continue Match"}
          </button>
        </div>
      </section>
    </div>
  )}</ModalPortal>;
}

/** Blocks the page while the authoritative pending-match request is running. */
export function PendingMatchLoadingGate() {
  return <ModalPortal>{(
    <div className="pending-match-overlay pending-match-overlay--loading" role="status" aria-live="polite">
      <section className="pending-match-dialog">
        <p>Match recovery</p>
        <h2>Checking your active match…</h2>
        <span>Please wait before starting another activity.</span>
      </section>
    </div>
  )}</ModalPortal>;
}

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
