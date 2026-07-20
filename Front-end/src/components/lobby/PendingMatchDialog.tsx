"use client";

interface PendingMatchDialogProps {
  isResolving?: boolean;
  onContinue: () => void;
  onForfeit: () => void;
}

export function PendingMatchDialog({ isResolving = false, onContinue, onForfeit }: PendingMatchDialogProps) {
  return (
    <div className="pending-match-overlay" role="dialog" aria-modal="true" aria-labelledby="pending-match-title">
      <section className="pending-match-dialog">
        <div className="pending-match-dialog__icon" aria-hidden="true">!</div>
        <p>Match in progress</p>
        <h2 id="pending-match-title">Do you want to leave the match?</h2>
        <span>Your opponent is waiting to reconnect. If you leave, you will be penalized and your ELO will be lowered immediately.</span>
        <div className="pending-match-dialog__actions">
          <button type="button" onClick={onForfeit} disabled={isResolving}>
            {isResolving ? "Processing..." : "Leave Match"}
          </button>
          <button type="button" onClick={onContinue} disabled={isResolving} autoFocus>
            Continue Match
          </button>
        </div>
      </section>
    </div>
  );
}
