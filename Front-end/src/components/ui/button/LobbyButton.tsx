"use client";

import React, { forwardRef, memo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { SfxType } from "../../../libs/audioManager";
import { Button, type ButtonProps } from "./Button";

export interface LobbyButtonProps extends Omit<ButtonProps, "variant" | "size" | "icon" | "href"> {
  /**
   * Route destination when clicked without custom onClick. Defaults to "/".
   */
  href?: string;
  /**
   * Optional custom button label. Defaults to "Lobby".
   */
  label?: React.ReactNode;
  /**
   * Optional custom leading icon. Defaults to <ArrowLeft size={16} />.
   */
  icon?: React.ReactNode;
  /**
   * Sound effect played on click: true (default) plays "click", a string plays that SFX, false disables.
   */
  sound?: boolean | SfxType | string;
  /**
   * Render as Next.js Link instead of button.
   */
  asLink?: boolean;
}

/**
 * LobbyButton: the "return to lobby" preset of <Button>.
 * Navigates to `href` (default "/") unless a custom `onClick` is supplied.
 */
export const LobbyButton = memo(
  forwardRef<HTMLButtonElement, LobbyButtonProps>(function LobbyButton(
    {
      onClick,
      href = "/",
      label = "Lobby",
      icon,
      sound = true,
      asLink = false,
      title = "Return to lobby",
      children,
      ...rest
    },
    ref
  ) {
    const router = useRouter();

    const handleClick = useCallback(
      async (event: React.MouseEvent<HTMLElement>) => {
        if (onClick) {
          await onClick(event);
        } else {
          router.push(href);
        }
      },
      [onClick, router, href]
    );

    return (
      <Button
        ref={ref}
        variant="ghost"
        size="compact"
        nudgeIcon
        icon={icon ?? <ArrowLeft size={16} />}
        sound={sound}
        title={title}
        aria-label={rest["aria-label"] ?? "Return to lobby"}
        href={asLink ? href : undefined}
        onClick={asLink ? undefined : handleClick}
        {...rest}
      >
        {children ?? label}
      </Button>
    );
  })
);

LobbyButton.displayName = "LobbyButton";

export default LobbyButton;
