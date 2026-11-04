import type { CSSProperties } from "react";
import styles from "./CornerBrackets.module.css";

export interface CornerBracketsProps {
  /** Width/height of each bracket arm in px. */
  size?: number;
  /** Border thickness in px. */
  thickness?: number;
  /** Any CSS color (hex, rgba, var(--token)). */
  color?: string;
  /** Distance from the parent's edge in px (negative pushes outward). */
  offset?: number;
}

const CORNERS = ["tl", "tr", "bl", "br"] as const;

/**
 * Four holographic corner brackets. Render as a child of a `position: relative`
 * (or otherwise positioned) container; it never affects layout.
 */
export function CornerBrackets({
  size = 7,
  thickness = 2,
  color = "#00f0ff",
  offset = 0,
}: CornerBracketsProps) {
  const style = {
    "--ui-corner-size": `${size}px`,
    "--ui-corner-thickness": `${thickness}px`,
    "--ui-corner-color": color,
    "--ui-corner-offset": `${offset}px`,
  } as CSSProperties;

  return (
    <>
      {CORNERS.map((corner) => (
        <span
          key={corner}
          className={`${styles.corner} ${styles[corner]}`}
          style={style}
          aria-hidden="true"
        />
      ))}
    </>
  );
}

export default CornerBrackets;
