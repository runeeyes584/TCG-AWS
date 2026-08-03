"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import { arenaEventBus } from "../../../libs/arenaEventBus";
import { useGameStore } from "../../../hooks/useGameStore";

export function PhaserArenaCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let destroyed = false;
    let game: Phaser.Game | undefined;
    let observer: ResizeObserver | undefined;

    void Promise.all([import("phaser"), import("./scenes/GameArenaScene")]).then(([PhaserModule, sceneModule]) => {
      if (destroyed || !hostRef.current) return;
      const Phaser = PhaserModule.default;
      game = new Phaser.Game({
        // Card artwork is served from the existing card CDN. Canvas rendering
        // displays those cross-origin images without requiring the CDN to add
        // WebGL CORS headers, while Phaser still owns the full board scene.
        type: Phaser.CANVAS,
        parent: hostRef.current,
        width: hostRef.current.clientWidth,
        height: hostRef.current.clientHeight,
        transparent: true,
        backgroundColor: "#020817",
        scene: [sceneModule.GameArenaScene],
        banner: false,
        render: { antialias: true, pixelArt: false }
      });

      observer = new ResizeObserver(([entry]) => {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) game?.scale.resize(width, height);
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

  return <div ref={hostRef} className="phaser-arena-canvas" aria-hidden="true" />;
}
