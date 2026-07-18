// src/components/game/pass-button.tsx
import React from "react";

export interface PassButtonProps {
  mode: string; // e.g., "PASS", "END_TURN", etc.
  label: string;
  sublabel?: string;
  enabled: boolean;
  onClick: () => void;
}

/**
 * Generic button used in the action bar. It mirrors the original button
 * that displayed an icon and two text lines.
 */
export const PassButton: React.FC<PassButtonProps> = ({ mode, label, sublabel, enabled, onClick }) => (
  <button
    type="button"
    className={`action-orb action-orb--${mode} ${enabled ? "action-orb--active" : ""}`}
    onClick={onClick}
    disabled={!enabled}
    aria-label={label}
  >
    <span className="action-orb__label">{label}</span>
    {sublabel && <span className="action-orb__sub">{sublabel}</span>}
  </button>
);
