"use client";

import React, { forwardRef, memo, useCallback } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useGlobalAudio } from "../../../contexts/AudioContext";
import type { SfxType } from "../../../libs/audioManager";
import styles from "./Button.module.css";

export type ButtonVariant = "ghost" | "primary" | "info" | "warning" | "accent" | "danger" | "success";
export type ButtonTone = "cyan" | "amber" | "red" | "accent";
export type ButtonSize = "compact" | "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void | Promise<void>;
  /** ghost: Lobby look; primary: green CTA; info: cyan CTA; warning: amber CTA; accent: CTA in the parent --ui-btn-accent; danger: destructive; success: confirmed/ready. */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Recolors the outline (ghost) button: amber, red, or the --ui-btn-accent of a parent. */
  tone?: ButtonTone;
  fullWidth?: boolean;
  /** Leading icon. Replaced by a spinner while `loading`. */
  icon?: React.ReactNode;
  /** Trailing icon. */
  iconEnd?: React.ReactNode;
  loading?: boolean;
  /** Label shown while loading. */
  loadingText?: React.ReactNode;
  /** true plays "click"; a string plays that SFX; false (default) is silent. */
  sound?: boolean | SfxType | string;
  /** Render a Next.js Link instead of a <button>. */
  href?: string;
  /** Slide the leading icon left on hover (back-style buttons). */
  nudgeIcon?: boolean;
  /** Cut the top left and bottom right corners (the shape of the cells of the table and of the board dialogs). */
  chamfer?: boolean;
}

/**
 * Square, cyan-hover button shared across the app.
 */
export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(function Button(
    {
      onClick,
      variant = "ghost",
      size = "md",
      tone = "cyan",
      fullWidth = false,
      icon,
      iconEnd,
      loading = false,
      loadingText,
      sound = false,
      href,
      nudgeIcon = false,
      chamfer = false,
      disabled = false,
      className = "",
      type = "button",
      children,
      ...rest
    },
    ref
  ) {
    const { playSfx } = useGlobalAudio();
    const isDisabled = disabled || loading;

    const playClickSound = useCallback(() => {
      if (sound === false) return;
      try {
        playSfx((typeof sound === "string" ? sound : "click") as SfxType);
      } catch {
        // Audio is optional; never block the click.
      }
    }, [sound, playSfx]);

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLElement>) => {
        if (isDisabled) {
          event.preventDefault();
          return;
        }
        playClickSound();
        await onClick?.(event);
      },
      [isDisabled, playClickSound, onClick]
    );

    const classes = [
      styles.btn,
      styles[variant],
      tone === "cyan" ? "" : styles[`tone${tone[0].toUpperCase()}${tone.slice(1)}`],
      size === "compact" ? "" : styles[size],
      fullWidth ? styles.full : "",
      nudgeIcon ? styles.nudge : "",
      chamfer ? styles.chamfer : "",
      loading ? styles.loading : "",
      isDisabled ? styles.disabled : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const leading = loading ? (
      <Loader2 size={16} className={`${styles.spinner}`} aria-hidden="true" />
    ) : icon ? (
      <span className={styles.icon} aria-hidden="true">{icon}</span>
    ) : null;
    const label = loading && loadingText ? loadingText : children;
    const content = (
      <>
        {leading}
        {label !== undefined && label !== null ? <span>{label}</span> : null}
        {iconEnd ? <span className={styles.icon} aria-hidden="true">{iconEnd}</span> : null}
      </>
    );

    if (href) {
      return (
        <Link
          href={href}
          className={classes}
          title={rest.title}
          aria-label={rest["aria-label"]}
          aria-disabled={isDisabled || undefined}
          style={rest.style}
          onClick={handleClick}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        onClick={handleClick}
        disabled={isDisabled}
        {...rest}
      >
        {content}
      </button>
    );
  })
);

Button.displayName = "Button";

export default Button;
