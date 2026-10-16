import { Shield, Swords } from "lucide-react";

export interface ActionPromptProps {
  /** A card is picked and needs a target. */
  targeting?: { cardName: string; instruction: string; onCancel: () => void };
  /** A player has to discard down to `limit`. */
  discard?: { playerName: string; count: number; limit: number };
  /** Units attacking, shown during the block phase. */
  attackerCount: number;
  /** The unit picked to block. */
  blockerName?: string;
}

/** What the player has to do right now, hung under the turn rail. Renders nothing when idle. */
export function ActionPrompt({ targeting, discard, attackerCount, blockerName }: ActionPromptProps) {
  if (!targeting && !discard && attackerCount <= 0 && !blockerName) return null;

  return (
    <div className="action-prompt">
      {targeting ? (
        <div className="center-target-prompt">
          <div className="target-dots" aria-hidden="true">
            <span className="target-dot" />
            <span className="target-dot" />
            <span className="target-dot" />
          </div>
          <div className="text-xs font-semibold text-cyan-200 tracking-wide drop-shadow-[0_0_6px_rgba(56,189,248,0.6)]">
            <strong className="text-white uppercase tracking-wider font-bold mr-1">{targeting.cardName}:</strong>
            <span>{targeting.instruction}</span>
          </div>
          <button
            type="button"
            onClick={targeting.onCancel}
            className="ml-1 rounded-full border border-red-500/50 bg-red-950/70 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-900/90 hover:text-white"
          >
            Cancel
          </button>
        </div>
      ) : null}
      {discard ? (
        <span className="stat-pill">
          Discard{" "}
          <strong>
            {discard.playerName} {discard.count}/{discard.limit}
          </strong>
        </span>
      ) : null}
      {attackerCount > 0 ? (
        <span className="stat-pill">
          <Swords size={12} aria-hidden="true" /> <strong>{attackerCount}</strong> attacking
        </span>
      ) : null}
      {blockerName ? (
        <span className="stat-pill">
          <Shield size={12} aria-hidden="true" /> <strong>{blockerName}</strong>
        </span>
      ) : null}
    </div>
  );
}
