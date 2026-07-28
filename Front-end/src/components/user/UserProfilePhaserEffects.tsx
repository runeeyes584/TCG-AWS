"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

export function UserProfilePhaserEffects() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser")
      .then(({ default: PhaserRuntime }) => {
        if (disposed || !hostRef.current) return;

        class UserProfileScene extends PhaserRuntime.Scene {
          private electricPulses: {
            head: Phaser.GameObjects.Arc;
            pathPoints: { x: number; y: number }[];
            progress: number;
            speed: number;
          }[] = [];
          private graphics!: Phaser.GameObjects.Graphics;

          constructor() {
            super("user-profile-effects");
          }

          create() {
            const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            this.graphics = this.add.graphics();
            this.createCircuitNetwork();
            this.createPowerCore();
            this.createEnergySparks(reducedMotion);
          }

          private createCircuitNetwork() {
            const { width, height } = this.scale;
            this.graphics.clear();
            this.graphics.lineStyle(1, 0xffd700, 0.18);

            // Draw futuristic cyber circuit lines
            const lines = [
              [{ x: 0, y: height * 0.15 }, { x: width * 0.25, y: height * 0.15 }, { x: width * 0.35, y: height * 0.25 }, { x: width, y: height * 0.25 }],
              [{ x: 0, y: height * 0.85 }, { x: width * 0.4, y: height * 0.85 }, { x: width * 0.55, y: height * 0.7 }, { x: width, y: height * 0.7 }],
              [{ x: width * 0.1, y: 0 }, { x: width * 0.1, y: height * 0.4 }, { x: width * 0.2, y: height * 0.5 }, { x: width * 0.2, y: height }],
              [{ x: width * 0.9, y: 0 }, { x: width * 0.9, y: height * 0.6 }, { x: width * 0.8, y: height * 0.75 }, { x: width * 0.8, y: height }]
            ];

            lines.forEach((path) => {
              this.graphics.beginPath();
              this.graphics.moveTo(path[0].x, path[0].y);
              for (let i = 1; i < path.length; i++) {
                this.graphics.lineTo(path[i].x, path[i].y);
              }
              this.graphics.strokePath();

              path.forEach((pt) => {
                this.add.circle(pt.x, pt.y, 3, 0xffd700, 0.3).setStrokeStyle(1, 0xffd700, 0.6);
              });
            });

            // Create electric pulse heads moving along circuit lines
            if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
              lines.forEach((pathPoints, idx) => {
                const pulseHead = this.add.circle(pathPoints[0].x, pathPoints[0].y, 4, idx % 2 === 0 ? 0xffd700 : 0x00f0ff, 0.85)
                  .setBlendMode(PhaserRuntime.BlendModes.ADD);

                this.electricPulses.push({
                  head: pulseHead,
                  pathPoints,
                  progress: (idx * 0.25) % 1,
                  speed: 0.0018 + (idx * 0.0004)
                });
              });
            }
          }

          private createPowerCore() {
            const { width, height } = this.scale;
            const cx = width * 0.5;
            const cy = height * 0.35;

            // Electric power aura rings
            const outerGlow = this.add.circle(cx, cy, 140, 0xffd700, 0.035)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            const innerGlow = this.add.circle(cx, cy, 90, 0x00f0ff, 0.04)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);

            this.tweens.add({
              targets: [outerGlow, innerGlow],
              scale: 1.18,
              alpha: 0.08,
              duration: 2200,
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut"
            });
          }

          private createEnergySparks(reducedMotion: boolean) {
            const { width, height } = this.scale;
            const colors = [0xffd700, 0x00f0ff, 0xa855f7];

            for (let i = 0; i < 28; i++) {
              const spark = this.add.rectangle(
                PhaserRuntime.Math.Between(0, width),
                PhaserRuntime.Math.Between(0, height),
                PhaserRuntime.Math.Between(2, 4),
                PhaserRuntime.Math.Between(6, 16),
                colors[i % 3],
                PhaserRuntime.Math.FloatBetween(0.15, 0.6)
              ).setBlendMode(PhaserRuntime.BlendModes.ADD);

              spark.setRotation(PhaserRuntime.Math.DegToRad(PhaserRuntime.Math.Between(-30, 30)));

              if (!reducedMotion) {
                this.tweens.add({
                  targets: spark,
                  y: spark.y - PhaserRuntime.Math.Between(30, 90),
                  alpha: 0.05,
                  duration: PhaserRuntime.Math.Between(2000, 4500),
                  delay: PhaserRuntime.Math.Between(0, 1500),
                  repeat: -1,
                  yoyo: true,
                  ease: "Sine.inOut"
                });
              }
            }
          }

          update() {
            // Animate electric pulses traveling along the circuit lines
            this.electricPulses.forEach((pulse) => {
              pulse.progress += pulse.speed;
              if (pulse.progress >= 1) pulse.progress = 0;

              const totalSegments = pulse.pathPoints.length - 1;
              const scaledProg = pulse.progress * totalSegments;
              const segIndex = Math.floor(scaledProg);
              const segT = scaledProg - segIndex;

              if (segIndex < totalSegments) {
                const p1 = pulse.pathPoints[segIndex];
                const p2 = pulse.pathPoints[segIndex + 1];
                const currX = PhaserRuntime.Math.Interpolation.Linear([p1.x, p2.x], segT);
                const currY = PhaserRuntime.Math.Interpolation.Linear([p1.y, p2.y], segT);

                pulse.head.setPosition(currX, currY);
              }
            });
          }
        }

        game = new PhaserRuntime.Game({
          type: PhaserRuntime.CANVAS,
          parent: hostRef.current,
          transparent: true,
          backgroundColor: "rgba(0,0,0,0)",
          scene: UserProfileScene,
          scale: {
            mode: PhaserRuntime.Scale.RESIZE,
            width: hostRef.current.clientWidth,
            height: hostRef.current.clientHeight
          },
          render: { antialias: true, pixelArt: false },
          audio: { noAudio: true }
        });
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="user-profile-phaser-effects" ref={hostRef} aria-hidden="true" />;
}
