/** The Nexus starts at 20 HP (`STARTING_NEXUS_HP`); the core ring has one segment per point. */
export const NEXUS_SEGMENTS = 20;
/** At this HP and below the ring is cracked, and at the second one it beats and the core turns red. */
export const NEXUS_CRACKED_HP = 11;
export const NEXUS_CRITICAL_HP = 5;

export type NexusSide = "viewer" | "opponent";

export interface NexusCoreStyle {
  /** Segments that are lit. */
  lit: number;
  cracked: boolean;
  critical: boolean;
  /** Ring and glow colours, as 0xRRGGBB. */
  tone: number;
  deep: number;
}

const TONES = {
  viewer: { tone: 0xc4b5fd, deep: 0x8b5cf6 },
  opponent: { tone: 0xff6f93, deep: 0xff2e63 }
} as const;

const clampHp = (hp: number) => Math.max(0, Math.min(NEXUS_SEGMENTS, Math.round(hp)));

/** How the core of a Nexus with `hp` looks: violet for the viewer, blood-red for the opponent. */
export function nexusCoreStyle(hp: number, side: NexusSide): NexusCoreStyle {
  const lit = clampHp(hp);
  const critical = lit <= NEXUS_CRITICAL_HP;
  return {
    lit,
    cracked: lit <= NEXUS_CRACKED_HP,
    critical,
    // A dying core is red whichever side it belongs to.
    tone: critical ? TONES.opponent.tone : TONES[side].tone,
    deep: critical ? TONES.opponent.deep : TONES[side].deep
  };
}

/** Segment indices that went dark (damage) or lit (healing) between two readings. */
export function changedSegments(previous: number, current: number) {
  const from = clampHp(previous);
  const to = clampHp(current);
  const lo = Math.min(from, to);
  const hi = Math.max(from, to);
  return {
    kind: to < from ? ("lost" as const) : to > from ? ("gained" as const) : ("none" as const),
    segments: Array.from({ length: hi - lo }, (_, i) => lo + i)
  };
}

/**
 * The arc of one segment, as angles in radians. Segments run clockwise from the top; each leaves
 * a gap, so the ring reads as twenty separate pieces.
 */
export function segmentArc(index: number, gapRadians = 0.09) {
  const step = (Math.PI * 2) / NEXUS_SEGMENTS;
  const start = -Math.PI / 2 + index * step + gapRadians / 2;
  return { start, end: start + step - gapRadians };
}
