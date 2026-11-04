import type * as Phaser from "phaser";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

type IconComponent = React.ComponentType<{ size?: string | number; color?: string; strokeWidth?: number }>;

/**
 * Makes an icon of the UI (a lucide or react-icons component) available to Phaser as a texture: the component is
 * rendered to SVG, which is loaded as an image. Phaser runs in canvas mode and paints no SVG itself. A texture that
 * already exists is left as it is, and `onLoaded` runs when a new one is ready, so the caller can paint again.
 */
export function loadIconTexture(
  scene: Phaser.Scene,
  key: string,
  Icon: IconComponent,
  options: { size: number; color: string; strokeWidth?: number },
  onLoaded: () => void
) {
  if (scene.textures.exists(key)) return;
  try {
    const svg = renderToStaticMarkup(
      React.createElement(Icon, { size: options.size, color: options.color, strokeWidth: options.strokeWidth })
    );
    const image = new Image();
    image.onload = () => {
      if (!scene.sys?.isActive() || !scene.textures) return;
      if (!scene.textures.exists(key)) scene.textures.addImage(key, image);
      onLoaded();
    };
    image.src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  } catch (error) {
    console.error("Failed to make an icon texture:", key, error);
  }
}
