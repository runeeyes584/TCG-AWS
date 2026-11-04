import type { SpellSpeed } from "@backend/game/types";
import { SPEED_STYLE } from "./spellSpeed";

/** The glyph of a spell speed (burst, fast, slow), in the speed's colour unless `color` is given. */
export function SpeedGlyph({ speed, className, color }: { speed: SpellSpeed; className?: string; color?: string }) {
  const style = SPEED_STYLE[speed];
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? style.color}
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={style.glyph} />
    </svg>
  );
}
