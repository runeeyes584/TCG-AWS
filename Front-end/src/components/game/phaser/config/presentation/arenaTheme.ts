/** Arena palette — mirrors the Figma tokens (Arena/Color). Violet = world/player, blood = threat. */
export const ARENA_COLORS = {
  void: "#050309",
  obsidian: "#0B0713",
  slab: "#140C24",
  slabHi: "#1E1238",
  violetDeep: "#2A1559",
  violetMid: "#5B33B5",
  violetBright: "#8B5CF6",
  violetGlow: "#C4B5FD",
  bloodDim: "#5A0F24",
  bloodMid: "#B3123A",
  bloodBright: "#FF2E63",
  gold: "#E8C26A",
} as const;

export const ARENA_HEX = {
  violetBright: 0x8b5cf6,
  violetGlow: 0xc4b5fd,
  violetMid: 0x5b33b5,
  violetDeep: 0x2a1559,
  bloodBright: 0xff2e63,
  bloodMid: 0xb3123a,
  bloodDim: 0x5a0f24,
  void: 0x050309,
} as const;

export function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Small deterministic PRNG so decorative scatter is stable across redraws. */
export function seededRandom(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
