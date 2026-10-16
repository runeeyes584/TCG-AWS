import type { ReactNode } from "react";
import styles from "./SectionHeading.module.css";

export interface EyebrowProps {
  children: ReactNode;
  /** Trailing glowing rule after the text (use <EyebrowRule /> for a mid-text rule). */
  line?: boolean;
  /** Remove the bottom margin. */
  flush?: boolean;
}

/** Glowing rule used inside an Eyebrow to separate two phrases. */
export function EyebrowRule() {
  return <span className={styles.line} aria-hidden="true" />;
}

/** Small uppercase kicker shown above a page/section title. */
export function Eyebrow({ children, line = false, flush = false }: EyebrowProps) {
  return (
    <p className={[styles.eyebrow, flush ? styles.flush : ""].filter(Boolean).join(" ")}>
      {children}
      {line ? <EyebrowRule /> : null}
    </p>
  );
}

export interface LedeProps {
  children: ReactNode;
  /** Allow a wider measure (480px). */
  wide?: boolean;
  /** Tighter spacing for stacked prompts (e.g. auth gate). */
  snug?: boolean;
}

/** Supporting paragraph under a page/section title. */
export function Lede({ children, wide = false, snug = false }: LedeProps) {
  const className = [styles.lede, wide ? styles.wide : "", snug ? styles.snug : ""]
    .filter(Boolean)
    .join(" ");
  return <p className={className}>{children}</p>;
}
