import type { ReactNode } from "react";
import styles from "./Callsign.module.css";

/**
 * A player's callsign inside text that is otherwise upper-cased (a dialog title, a label). A callsign is shown as the
 * player wrote it, capitals included, wherever it appears.
 */
export function Callsign({ children }: { children: ReactNode }) {
  return <span className={styles.callsign}>{children}</span>;
}
