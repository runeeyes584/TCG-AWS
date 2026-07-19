import React from "react";
import clsx from "clsx";
import { CirclePause, Shield, Swords } from "lucide-react";
import { motion } from "framer-motion";

export interface PassButtonProps {
  mode: "attack" | "defend" | "idle";
  label: string;
  sublabel?: string;
  enabled: boolean;
  onClick: () => void;
}

/** Smart action button with v2 motion feedback and production combat modes. */
export const PassButton: React.FC<PassButtonProps> = ({
  mode,
  label,
  sublabel,
  enabled,
  onClick
}) => {
  const Icon = mode === "attack" ? Swords : mode === "defend" ? Shield : CirclePause;
  const accessibleLabel = sublabel ? `${label}: ${sublabel}` : label;

  return (
    <motion.button
      type="button"
      className={clsx(
        "pass-button-v2",
        `pass-button-v2--${mode}`,
        enabled && "pass-button-v2--active"
      )}
      disabled={!enabled}
      onClick={onClick}
      whileHover={enabled ? { scale: 1.05 } : undefined}
      whileTap={enabled ? { scale: 0.95 } : undefined}
      aria-label={accessibleLabel}
    >
      <Icon className="pass-button-v2__icon" size={18} aria-hidden="true" />
      <span className="pass-button-v2__label">{label}</span>
      {sublabel ? <span className="pass-button-v2__sub">{sublabel}</span> : null}
    </motion.button>
  );
};
