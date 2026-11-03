/** How far a card the pointer is on rises, as a share of its own height, and how much larger it grows. */
export const HOVER_LIFT_RATIO = 0.12;
export const HOVER_SCALE = 1.14;

export interface HoverPose {
  scale: number;
  /** Pixels the card is raised, towards the top of the screen. */
  lift: number;
}

/** The pose of a card at `t` (0 = lying in its slot, 1 = fully lifted); `height` is the card's own height. */
export function hoverPose(t: number, height: number): HoverPose {
  const k = Math.min(1, Math.max(0, t));
  return { scale: 1 + (HOVER_SCALE - 1) * k, lift: HOVER_LIFT_RATIO * height * k };
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** The box of a card seen from the pointer's side once it is lifted: grown about its centre and raised. */
export function liftedRect(rect: Rect, t = 1): Rect {
  const { scale, lift } = hoverPose(t, rect.height);
  const width = rect.width * scale;
  const height = rect.height * scale;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2 - lift,
    width,
    height
  };
}
