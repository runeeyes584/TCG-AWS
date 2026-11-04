import type { TurnUrgency } from "../infoBoard/turnRail";

/** What the pass / attack / defend seal means right now; mirrors `getSmartAction()`. */
export type PassSealMode = "attack" | "defend" | "idle";

export interface PassSealState {
  mode: PassSealMode;
  label: string;
  sublabel?: string;
  /** False while the player has to wait: the seal greys out and cannot be pressed. */
  enabled: boolean;
  /** How close the running turn is to timing out; an enabled seal pulses with the clock. */
  urgency: TurnUrgency;
  hover: boolean;
  pressed: boolean;
}

export interface PassSealStyle {
  /** Ring, glow and diamond colour. */
  tone: string;
  /** Orbiting highlight along the ring: only for states that commit combat, and for a running-out clock. */
  orbit: boolean;
  /** Dash ring spin in degrees per second. */
  spin: number;
  /** Beat amplitude as a fraction of the scale, 1 beat per second (the clock's tick). */
  pulse: number;
  /** Glow strength, 0..1. */
  glow: number;
  /** Whole-seal opacity. */
  alpha: number;
  /** Scale: hover lifts the seal, a press sinks it. */
  scale: number;
  /** Label colour. */
  text: string;
}

export const PASS_SEAL_TONES = {
  idle: "#8b5cf6",
  attack: "#ff2e63",
  defend: "#e8c26a",
  waiting: "#6b6486",
  warn: "#e8c26a",
  critical: "#fff3cf"
} as const;

/**
 * The look of the seal for a state. One tone per state: violet to pass, blood to attack, gold to
 * defend, grey while waiting. Only attack and defend get the orbiting highlight; in the last ten
 * seconds an enabled seal beats with the clock, and an idle (pass) seal takes the clock's colour.
 */
export function passSealStyle(state: PassSealState): PassSealStyle {
  const { mode, enabled, urgency, hover, pressed } = state;

  if (!enabled) {
    return {
      tone: PASS_SEAL_TONES.waiting,
      orbit: false,
      spin: 4,
      pulse: 0,
      glow: 0.12,
      alpha: 0.6,
      scale: 1,
      text: "#9a93b4"
    };
  }

  const urgent = urgency !== "calm";
  const tone =
    mode === "attack"
      ? PASS_SEAL_TONES.attack
      : mode === "defend"
        ? PASS_SEAL_TONES.defend
        : urgency === "critical"
          ? PASS_SEAL_TONES.critical
          : urgency === "warn"
            ? PASS_SEAL_TONES.warn
            : PASS_SEAL_TONES.idle;

  return {
    tone,
    orbit: mode !== "idle" || urgent,
    spin: (mode === "idle" ? 8 : 14) * (hover ? 2.5 : 1),
    pulse: urgency === "critical" ? 0.07 : urgency === "warn" ? 0.035 : 0,
    glow: (mode === "idle" ? 0.32 : 0.55) + (hover ? 0.25 : 0) + (urgent ? 0.15 : 0),
    alpha: 1,
    scale: pressed ? 0.95 : hover ? 1.05 : 1,
    text: "#f4f0ff"
  };
}

export interface ClientRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Where the seal sits on the Phaser canvas, from where its DOM button is on the page.
 * `canvas` is the canvas' client rect; `size` is the scene size in canvas px.
 */
export function sealPlacement(rect: ClientRect, canvas: ClientRect, size: { width: number; height: number }) {
  const sx = canvas.width > 0 ? size.width / canvas.width : 1;
  const sy = canvas.height > 0 ? size.height / canvas.height : 1;
  return {
    x: (rect.x + rect.width / 2 - canvas.x) * sx,
    y: (rect.y + rect.height / 2 - canvas.y) * sy,
    radius: (Math.min(rect.width, rect.height) / 2) * Math.min(sx, sy)
  };
}

/** Sublabel that fits the ring: long names are cut with an ellipsis. */
export function fitSealText(text: string | undefined, max: number) {
  const value = (text ?? "").trim();
  return value.length > max ? `${value.slice(0, Math.max(1, max - 1))}…` : value;
}
