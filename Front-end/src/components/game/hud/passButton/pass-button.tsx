import React, { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { arenaEventBus } from "../../../../libs/arenaEventBus";
import type { PassSealMode } from "./passSeal";
import type { TurnUrgency } from "../infoBoard/turnRail";

export interface PassButtonProps {
  mode: PassSealMode;
  label: string;
  sublabel?: string;
  enabled: boolean;
  /** How close the turn is to timing out; an enabled seal beats with the clock. */
  urgency?: TurnUrgency;
  onClick: () => void;
}

const SAME_RECT_PX = 0.5;

/**
 * The seal that ends the player's action: pass, attack or defend. Phaser paints it (see
 * `PassSealRenderer`); this button is its hit area. It owns the click, the focus, the disabled
 * state and the screen-reader label, and reports its state and screen position to Phaser, so the
 * rules in `getSmartAction()` stay the only thing that decides what pressing it does.
 */
export const PassButton: React.FC<PassButtonProps> = ({
  mode,
  label,
  sublabel,
  enabled,
  urgency = "calm",
  onClick
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lastRectRef = useRef<DOMRect | null>(null);
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const accessibleLabel = sublabel ? `${label}: ${sublabel}` : label;

  const report = useCallback(() => {
    const element = buttonRef.current;
    if (!element) return;
    const box = element.getBoundingClientRect();
    lastRectRef.current = box;
    arenaEventBus.emit("PASS_SEAL", {
      mode,
      label,
      sublabel,
      enabled,
      urgency,
      hover: enabled && hover,
      pressed: enabled && pressed,
      rect: { x: box.left, y: box.top, width: box.width, height: box.height }
    });
  }, [mode, label, sublabel, enabled, urgency, hover, pressed]);

  // A change of state is reported at once.
  useEffect(report, [report]);

  // The HUD column can move without this button changing (a spell stack appears, the window is
  // resized), so its position is checked now and then and re-reported only when it changed.
  useEffect(() => {
    const check = () => {
      const element = buttonRef.current;
      const last = lastRectRef.current;
      if (!element || !last) return;
      const box = element.getBoundingClientRect();
      if (
        Math.abs(box.left - last.left) > SAME_RECT_PX ||
        Math.abs(box.top - last.top) > SAME_RECT_PX ||
        Math.abs(box.width - last.width) > SAME_RECT_PX
      ) {
        report();
      }
    };
    const interval = window.setInterval(check, 200);
    window.addEventListener("resize", check);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("resize", check);
    };
  }, [report]);

  useEffect(() => () => arenaEventBus.emit("PASS_SEAL", undefined), []);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={clsx("pass-button-v2", enabled && "pass-button-v2--active")}
      disabled={!enabled}
      onClick={onClick}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => {
        setHover(false);
        setPressed(false);
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onFocus={(event) => setHover(event.currentTarget.matches(":focus-visible"))}
      onBlur={() => setHover(false)}
      aria-label={accessibleLabel}
    >
      <span className="pass-button-v2__text">{accessibleLabel}</span>
    </button>
  );
};
