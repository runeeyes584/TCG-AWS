"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { arenaEventBus } from "../../../libs/arenaEventBus";
import { useGameStore } from "../../../hooks/useGameStore";
import { arenaDpr, backingSize } from "./config/arenaScale";

export function PhaserArenaCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let game: Phaser.Game | undefined;
    let observer: ResizeObserver | undefined;

    void Promise.all([import("phaser"), import("./scenes/GameArenaScene")]).then(([PhaserModule, sceneModule]) => {
      if (destroyed || !hostRef.current) return;
      const Phaser = (PhaserModule as any).default || PhaserModule;
      // The canvas has a pixel for every device pixel (up to 1.5 per CSS pixel) and is shown at the size of its box.
      const dpr = arenaDpr(window.devicePixelRatio);
      game = new Phaser.Game({
        // Card artwork comes from third-party CDNs that do not consistently
        // expose CORS headers. Canvas can render those images directly while
        // keeping the board VFX (graphics, tweens and camera shake) intact.
        type: Phaser.CANVAS,
        parent: hostRef.current,
        width: backingSize(hostRef.current.clientWidth, dpr),
        height: backingSize(hostRef.current.clientHeight, dpr),
        scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
        transparent: true,
        backgroundColor: "#020817",
        scene: [sceneModule.GameArenaScene],
        banner: false,
        render: { antialias: true, pixelArt: false }
      });

      observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0 || !game) return;
        // The pixel ratio can change with the window (another screen, page zoom).
        const ratio = arenaDpr(window.devicePixelRatio);
        game.scale.setZoom(1 / ratio);
        game.scale.resize(backingSize(width, ratio), backingSize(height, ratio));
      });
      observer.observe(hostRef.current);

      const { gameState, viewerPlayerId, camera } = useGameStore.getState();
      if (gameState) {
        arenaEventBus.emit("UPDATE_SLOTS", { gameState, viewerPlayerId });
        arenaEventBus.emit("CAMERA_CHANGE", camera);
      }
    });

    return () => {
      destroyed = true;
      observer?.disconnect();
      game?.destroy(true);
    };
  }, []);

  return <div ref={hostRef} className="phaser-arena-canvas absolute inset-0 w-full h-full pointer-events-none z-0" aria-hidden="true" />;
}
