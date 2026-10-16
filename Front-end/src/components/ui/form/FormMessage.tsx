import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import styles from "./FormMessage.module.css";

export interface FormMessageProps {
  /**
   * error / success: banner with a colored edge;
   * inline: small red text for a single field;
   * hint: muted helper text.
   */
  tone?: "error" | "success" | "inline" | "hint";
  /** Overrides the default icon (pass null for none). */
  icon?: ReactNode;
  children: ReactNode;
}

const DEFAULT_ICON: Record<NonNullable<FormMessageProps["tone"]>, ReactNode> = {
  error: <AlertCircle size={16} />,
  success: <CheckCircle2 size={16} />,
  inline: <AlertTriangle size={15} />,
  hint: null,
};

/** Feedback line for forms. Errors use role="alert", success uses role="status". */
export function FormMessage({ tone = "error", icon, children }: FormMessageProps) {
  const role = tone === "hint" ? undefined : tone === "success" ? "status" : "alert";
  const shownIcon = icon === undefined ? DEFAULT_ICON[tone] : icon;

  return (
    <p className={`${styles.message} ${styles[tone]}`} role={role}>
      {shownIcon}
      {tone === "hint" || shownIcon === null ? children : <span>{children}</span>}
    </p>
  );
}

export interface FormNoticeProps {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  /** Buttons rendered under the body. */
  actions?: ReactNode;
}

/** Amber callout used for account-state prompts (verify / already registered). */
export function FormNotice({ title, icon, children, actions }: FormNoticeProps) {
  return (
    <div className={styles.notice} role="alert">
      <div className={styles.noticeTitle}>
        {icon}
        <span>{title}</span>
      </div>
      <p className={styles.noticeBody}>{children}</p>
      {actions ? <div className={styles.noticeActions}>{actions}</div> : null}
    </div>
  );
}
