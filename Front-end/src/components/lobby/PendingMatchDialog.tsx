"use client";

interface PendingMatchDialogProps {
  status: "WAITING" | "IN_PROGRESS";
  isResolving?: boolean;
  onContinue: () => void;
  onForfeit: () => void;
}

export function PendingMatchDialog({ status, isResolving = false, onContinue, onForfeit }: PendingMatchDialogProps) {
  const isQueue = status === "WAITING";
  return (
    <div className="pending-match-overlay" role="dialog" aria-modal="true" aria-labelledby="pending-match-title">
      <section className="pending-match-dialog">
        <div className="pending-match-dialog__icon" aria-hidden="true">!</div>
        <p>{isQueue ? "Matchmaking in progress" : "Match in progress"}</p>
        <h2 id="pending-match-title">{isQueue ? "Resume matchmaking?" : "Do you want to leave the match?"}</h2>
        <span>
          {isQueue
            ? "You are still in the matchmaking queue. You can continue searching or cancel without any ELO penalty."
            : "Your opponent is waiting to reconnect. If you leave, you will be penalized and your ELO will be lowered immediately."}
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
  );
}
