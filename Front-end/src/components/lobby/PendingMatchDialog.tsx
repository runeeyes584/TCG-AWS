"use client";

import { Radio, Swords, Play, LogOut } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";

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
    <Modal
      tone="cyan"
      shape="rounded"
      align="center"
      maxWidth={460}
      zIndex={10000}
      labelledBy="pending-match-title"
    >
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
        <Button
          variant="danger"
          fullWidth
          icon={<LogOut size={16} />}
          onClick={onForfeit}
          loading={isResolving}
          loadingText="Leaving..."
          disabled={isContinuing}
        >
          {isQueue ? "Cancel Search" : "Leave Match"}
        </Button>
        <Button
          variant="info"
          fullWidth
          icon={<Play size={16} />}
          onClick={onContinue}
          loading={isContinuing}
          loadingText="Connecting..."
          disabled={isResolving}
          autoFocus
        >
          {isQueue ? "Continue Searching" : "Continue Match"}
        </Button>
      </div>
    </Modal>
  );
}
