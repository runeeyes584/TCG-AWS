"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import styles from "./TextField.module.css";

export interface PasswordToggle {
  visible: boolean;
  onToggle: () => void;
  /** Accessible label; defaults to "Show/Hide password". */
  label?: string;
}

export interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: ReactNode;
  /** Leading icon (ignored by the otp variant). */
  icon?: ReactNode;
  /** otp: wide centered code entry. */
  variant?: "default" | "otp";
  /** Adds a show/hide button; the caller owns the `visible` state and the input `type`. */
  passwordToggle?: PasswordToggle;
  invalid?: boolean;
}

/**
 * Labelled text input in the tactical HUD style. All native input props are forwarded.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, icon, variant = "default", passwordToggle, invalid = false, className, ...inputProps },
  ref
) {
  const isOtp = variant === "otp";
  const boxClass = [styles.box, isOtp ? styles.otp : "", invalid ? styles.invalid : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <div className={boxClass}>
        {!isOtp && icon ? <span aria-hidden="true" style={{ display: "inline-flex" }}>{icon}</span> : null}
        <input
          ref={ref}
          className={[styles.input, className].filter(Boolean).join(" ")}
          aria-invalid={invalid || undefined}
          {...inputProps}
        />
        {passwordToggle ? (
          <button
            type="button"
            className={styles.toggle}
            onClick={passwordToggle.onToggle}
            aria-label={passwordToggle.label ?? (passwordToggle.visible ? "Hide password" : "Show password")}
          >
            {passwordToggle.visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        ) : null}
      </div>
    </label>
  );
});

export default TextField;
