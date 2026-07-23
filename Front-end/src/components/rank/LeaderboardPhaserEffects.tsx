"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

const podiumColors = [0xa9d7ff, 0xf4d36b, 0xd99766];

export function LeaderboardPhaserEffects() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then(({ default: PhaserRuntime }) => {
      if (disposed || !hostRef.current) return;

      class LeaderboardScene extends PhaserRuntime.Scene {
        private podiums: Phaser.GameObjects.Container[] = [];
        private reducedMotion = false;

        constructor() {
          super("leaderboard-podium-effects");
        }

        create() {
          this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          this.createCircuitLines();
          podiumColors.forEach((color, index) => this.createPodium(index, color));
          this.layout();
          this.scale.on("resize", this.layout, this);
        }

        private createCircuitLines() {
          const graphics = this.add.graphics().setAlpha(0.3);
          graphics.lineStyle(1, 0x71dcff, 0.22);
          for (let row = 0; row < 5; row += 1) {
            const y = 28 + row * 45;
            graphics.beginPath();
            graphics.moveTo(0, y);
            graphics.lineTo(120, y);
            graphics.lineTo(150, y + 18);
            graphics.lineTo(340, y + 18);
            graphics.lineTo(370, y);
            graphics.lineTo(900, y);
            graphics.strokePath();
          }
        }

        private createPodium(index: number, color: number) {
          const container = this.add.container();
          const beam = this.add.rectangle(0, 25, 150, 250, color, index === 1 ? 0.09 : 0.055)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);
          const base = this.add.ellipse(0, 150, 190, 26, color, 0.18)
            .setStrokeStyle(2, color, 0.48)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);
          const halo = this.add.circle(0, -76, index === 1 ? 58 : 46, color, 0.025)
            .setStrokeStyle(index === 1 ? 3 : 2, color, 0.65)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);
          const innerHalo = this.add.circle(0, -76, index === 1 ? 39 : 31, color, 0)
            .setStrokeStyle(1, 0xffffff, 0.38);

          container.add([beam, base, halo, innerHalo]);
          for (let particleIndex = 0; particleIndex < (index === 1 ? 16 : 10); particleIndex += 1) {
            const shard = this.add.rectangle(
              PhaserRuntime.Math.Between(-75, 75),
              PhaserRuntime.Math.Between(-145, 125),
              PhaserRuntime.Math.Between(2, 4),
              PhaserRuntime.Math.Between(5, 12),
              color,
              PhaserRuntime.Math.FloatBetween(0.2, 0.72)
            ).setRotation(PhaserRuntime.Math.DegToRad(45));
            container.add(shard);
            if (!this.reducedMotion) {
              this.tweens.add({
                targets: shard,
                y: shard.y - PhaserRuntime.Math.Between(22, 58),
                alpha: 0.08,
                angle: shard.angle + PhaserRuntime.Math.Between(70, 160),
                duration: PhaserRuntime.Math.Between(1500, 3000),
                delay: PhaserRuntime.Math.Between(0, 900),
                repeat: -1,
                yoyo: true,
                ease: "Sine.inOut"
              });
            }
          }

          if (!this.reducedMotion) {
            this.tweens.add({
              targets: [halo, innerHalo],
              scale: index === 1 ? 1.13 : 1.08,
              alpha: 0.25,
              duration: index === 1 ? 1400 : 1900,
              delay: index * 180,
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut"
            });
            this.tweens.add({
              targets: base,
              scaleX: 1.1,
              alpha: 0.08,
              duration: 1700 + index * 230,
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut"
            });
          }

          this.podiums.push(container);
        }

        private layout() {
          const { width, height } = this.scale;
          const mobile = width < 680;
          const positions = mobile
            ? [[width * 0.5, height * 0.53], [width * 0.5, height * 0.53], [width * 0.5, height * 0.53]]
            : [[width * 0.18, height * 0.5], [width * 0.5, height * 0.43], [width * 0.82, height * 0.5]];
          this.podiums.forEach((podium, index) => {
            podium.setPosition(positions[index][0], positions[index][1]);
            podium.setVisible(!mobile || index === 1);
          });
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: hostRef.current,
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scene: LeaderboardScene,
        scale: {
          mode: PhaserRuntime.Scale.RESIZE,
          width: hostRef.current.clientWidth,
          height: hostRef.current.clientHeight
        },
        render: { antialias: true, pixelArt: false },
        audio: { noAudio: true }
      });
    }).catch(() => undefined);

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="leaderboard-phaser-effects" ref={hostRef} aria-hidden="true" />;
}
