import type { CardDefinition, SpellSpeed } from "@backend/game/types";

export interface SpeedStyle {
  label: string;
  color: string;
  /** What the engine does with it; nothing more is promised. */
  hint: string;
  /** A stroked glyph on a 24 × 24 grid: the same path is drawn by the DOM card (SVG) and the canvas card (Path2D). */
  glyph: string;
}

export const SPEED_STYLE: Record<SpellSpeed, SpeedStyle> = {
  burst: {
    label: "Burst",
    color: "#f2c94c",
    hint: "Resolves at once and you keep priority.",
    glyph: "M13.5 2.5 5.5 13.5H11.5L10.5 21.5 18.5 10.5H12.5Z"
  },
  fast: {
    label: "Fast",
    color: "#67d4ff",
    hint: "Passes priority to the opponent once cast.",
    glyph: "M4 5.5 11 12 4 18.5M12 5.5 19 12 12 18.5"
  },
  slow: {
    label: "Slow",
    color: "#b794f6",
    hint: "Passes priority to the opponent once cast. A spell with no speed is slow.",
    glyph: "M6.5 3h11M6.5 21h11M7.5 3C7.5 9 12 10 12 12S7.5 15 7.5 21M16.5 3C16.5 9 12 10 12 12S16.5 15 16.5 21"
  }
};

/** The speed of a spell (a spell with none is slow, as the engine plays it); units and champions have none. */
export function speedOf(definition: Pick<CardDefinition, "type" | "spellSpeed">): SpellSpeed | undefined {
  if (definition.type !== "spell") return undefined;
  return definition.spellSpeed ?? "slow";
}
