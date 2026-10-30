import type { GraveyardCause } from "@backend/game/types";
import type { GraveyardChangeKind } from "../../hud/graveyard/graveyardChanges";

/**
 * The paths and timings of the graveyard effects (`GraveyardFx`), as plain functions of time so that they can be
 * checked without a canvas. Times are in ms since the effect began; positions in the arena's own pixels.
 */

export interface Point {
  x: number;
  y: number;
}

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
export const easeOut = (t: number) => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number) => Math.pow(clamp01(t), 2.2);
export const easeInOut = (t: number) => {
  const p = clamp01(t);
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
};

/** How far a stage that begins at `delay` and lasts `duration` has come at time `t`: 0 before it, 1 after it. */
export function stage(t: number, delay: number, duration: number): number {
  return duration <= 0 ? (t >= delay ? 1 : 0) : clamp01((t - delay) / duration);
}

/** A point on the curve from `from` to `to` that bows sideways by `bow` px (to the left of the way there if positive). */
export function bezierPoint(from: Point, to: Point, bow: number, p: number): Point {
  const t = clamp01(p);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const control = { x: (from.x + to.x) / 2 + (dy / length) * bow, y: (from.y + to.y) / 2 - (dx / length) * bow };
  const u = 1 - t;
  return {
    x: u * u * from.x + 2 * u * t * control.x + t * t * to.x,
    y: u * u * from.y + 2 * u * t * control.y + t * t * to.y
  };
}

/** A point of a spiral that winds `turns` times into `center` from `radius` away, starting at `startAngle`. */
export function spiralPoint(center: Point, radius: number, turns: number, startAngle: number, p: number): Point {
  const t = clamp01(p);
  const angle = startAngle + turns * Math.PI * 2 * t;
  const r = radius * (1 - t);
  return { x: center.x + Math.cos(angle) * r, y: center.y + Math.sin(angle) * r };
}

/** Where mote `index` of `count` stands before it falls: on an arc above `center`, from upper left to upper right. */
export function moteStart(center: Point, index: number, count: number, radius: number): Point {
  const spread = count <= 1 ? 0.5 : index / (count - 1);
  const angle = (-160 + spread * 140) * (Math.PI / 180);
  return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius };
}

/** Mote `index` falling into `center`: it starts slowly and speeds up. */
export function moteAt(center: Point, index: number, count: number, radius: number, p: number): Point {
  const start = moteStart(center, index, count, radius);
  const t = easeIn(p);
  return { x: start.x + (center.x - start.x) * t, y: start.y + (center.y - start.y) * t };
}

/** The colour of a card that falls in, by what put it there; and of the others, by how they leave. Shared by the souls and the piles. */
export const CAUSE_COLOR: Record<GraveyardCause, number> = {
  COMBAT: 0xff2e63,
  SPELL: 0xa78bfa,
  EFFECT: 0xe8c26a,
  MODIFIER_EXPIRED: 0xe8c26a,
  DISCARD: 0xc4b5fd,
  MILL: 0xc4b5fd
};
export const KIND_COLOR: Record<Exclude<GraveyardChangeKind, "ENTER">, number> = {
  REVIVE: 0xf3cf72,
  REBIRTH: 0xa5f3fc,
  BANISH: 0xb026ff
};

/** How long each effect lasts, and how long the soul of a revived unit waits for the unit's card to appear. */
export const FX_MS: Record<GraveyardChangeKind, number> = {
  ENTER: 640,
  REVIVE: 1100,
  REBIRTH: 860,
  BANISH: 700
};
export const WAIT_FOR_TARGET_MS = 400;
/** A bare ring and nothing else, for those who ask for less motion. */
export const REDUCED_MS = 220;

export const FX_REVIVE = { pillar: [0, 500], flight: [120, 620], burst: [740, 360] } as const;
export const FX_REBIRTH = { flight: [0, 520], burst: [520, 340] } as const;
export const FX_BANISH = { open: [0, 200], pull: [120, 460], close: [560, 140] } as const;
export const FX_ENTER = { fall: [0, 380], gulp: [300, 260] } as const;
