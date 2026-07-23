"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

export function MatchRecoveryPhaserLoader() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;
    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then(({ default: PhaserRuntime }) => {
      if (disposed || !hostRef.current) return;

      class RecoveryScene extends PhaserRuntime.Scene {
        constructor() { super("match-recovery-loader"); }

        create() {
          [0x75d8ff, 0x9ce8ff, 0xc2f2ff].forEach((color, index) => {
            const dot = this.add.circle(42 + index * 42, 30, 7, color, 0.95)
              .setStrokeStyle(2, color, 0.35);
            this.tweens.add({
              targets: dot,
              y: 18,
              scale: 1.28,
              alpha: 0.55,
              duration: 520,
              delay: index * 150,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut"
            });
          });
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: hostRef.current,
        width: 168,
        height: 60,
        transparent: true,
        scene: RecoveryScene,
        render: { antialias: true },
        audio: { noAudio: true }
      });
    }).catch(() => undefined);

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="match-recovery-loader" ref={hostRef} aria-hidden="true" />;
}
