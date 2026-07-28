"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

type CircuitPoint = [number, number];

export function UserProfilePhaserEffects() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then(({ default: PhaserRuntime }) => {
      if (disposed || !hostRef.current) return;

      class UserProfileScene extends PhaserRuntime.Scene {
        private staticLayer!: Phaser.GameObjects.Graphics;
        private energyLayer!: Phaser.GameObjects.Graphics;
        private nodes: Phaser.GameObjects.Arc[] = [];
        private pulses: Phaser.GameObjects.Arc[] = [];
        private shards: Phaser.GameObjects.Rectangle[] = [];
        private paths: Phaser.Curves.Path[] = [];
        private reducedMotion = false;
        private dischargeEvent?: Phaser.Time.TimerEvent;

        constructor() {
          super("user-profile-power-grid");
        }

        create() {
          this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          this.staticLayer = this.add.graphics();
          this.energyLayer = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);
          this.rebuild();
          this.scale.on("resize", this.rebuild, this);

          if (!this.reducedMotion) {
            this.dischargeEvent = this.time.addEvent({
              delay: 2600,
              callback: this.flashDischarge,
              callbackScope: this,
              loop: true,
            });
          }
        }

        private rebuild() {
          this.nodes.forEach((node) => {
            this.tweens.killTweensOf(node);
            node.destroy();
          });
          this.pulses.forEach((pulse) => {
            this.tweens.killTweensOf(pulse);
            pulse.destroy();
          });
          this.shards.forEach((shard) => {
            this.tweens.killTweensOf(shard);
            shard.destroy();
          });
          this.nodes = [];
          this.pulses = [];
          this.shards = [];
          this.paths = [];
          this.staticLayer.clear();
          this.energyLayer.clear();

          const { width, height } = this.scale;
          if (width <= 0 || height <= 0) return;

          this.drawAtmosphere(width, height);
          this.drawCircuits(width, height);
          this.createDataShards(width, height);
        }

        private drawAtmosphere(width: number, height: number) {
          const focusX = width < 760 ? width * 0.5 : width * 0.28;
          const focusY = height * 0.54;
          const radius = Math.min(width, height) * 0.25;

          this.staticLayer.fillStyle(0x132c4c, 0.08);
          this.staticLayer.fillCircle(focusX, focusY, radius * 1.55);
          this.staticLayer.lineStyle(1, 0x49e6ff, 0.12);
          this.staticLayer.strokeCircle(focusX, focusY, radius);
          this.staticLayer.lineStyle(1, 0x8d6bff, 0.1);
          this.staticLayer.strokeCircle(focusX, focusY, radius * 1.34);

          for (let index = 0; index < 16; index += 1) {
            const angle = (Math.PI * 2 * index) / 16;
            const inner = radius * (index % 2 === 0 ? 0.98 : 1.28);
            const outer = inner + (index % 2 === 0 ? 12 : 7);
            this.staticLayer.lineStyle(1, index % 3 === 0 ? 0xffcf5a : 0x49e6ff, 0.2);
            this.staticLayer.beginPath();
            this.staticLayer.moveTo(focusX + Math.cos(angle) * inner, focusY + Math.sin(angle) * inner);
            this.staticLayer.lineTo(focusX + Math.cos(angle) * outer, focusY + Math.sin(angle) * outer);
            this.staticLayer.strokePath();
          }

          if (!this.reducedMotion) {
            const orbit = this.add.circle(focusX, focusY, radius * 0.72, 0x49e6ff, 0)
              .setStrokeStyle(1, 0x49e6ff, 0.16)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.nodes.push(orbit);
            this.tweens.add({
              targets: orbit,
              angle: 360,
              scale: 1.08,
              alpha: { from: 0.34, to: 0.8 },
              duration: 9000,
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut",
            });
          }
        }

        private drawCircuits(width: number, height: number) {
          const mobile = width < 760;
          const circuits: CircuitPoint[][] = mobile
            ? [
                [[0, height * 0.18], [width * 0.2, height * 0.18], [width * 0.3, height * 0.28], [width * 0.3, height * 0.48]],
                [[width, height * 0.32], [width * 0.78, height * 0.32], [width * 0.68, height * 0.43], [width * 0.68, height * 0.7]],
                [[0, height * 0.82], [width * 0.24, height * 0.82], [width * 0.34, height * 0.72], [width * 0.58, height * 0.72]],
              ]
            : [
                [[0, height * 0.17], [width * 0.14, height * 0.17], [width * 0.2, height * 0.25], [width * 0.34, height * 0.25]],
                [[0, height * 0.72], [width * 0.13, height * 0.72], [width * 0.2, height * 0.63], [width * 0.37, height * 0.63]],
                [[width, height * 0.2], [width * 0.82, height * 0.2], [width * 0.76, height * 0.29], [width * 0.62, height * 0.29]],
                [[width, height * 0.76], [width * 0.86, height * 0.76], [width * 0.79, height * 0.66], [width * 0.61, height * 0.66]],
                [[width * 0.45, 0], [width * 0.45, height * 0.1], [width * 0.5, height * 0.16], [width * 0.5, height * 0.29]],
                [[width * 0.38, height], [width * 0.38, height * 0.9], [width * 0.44, height * 0.83], [width * 0.58, height * 0.83]],
              ];

          circuits.forEach((points, pathIndex) => {
            const color = pathIndex % 3 === 1 ? 0x8d6bff : 0x49e6ff;
            const path = new PhaserRuntime.Curves.Path(points[0][0], points[0][1]);
            this.staticLayer.lineStyle(1, color, 0.17);
            this.staticLayer.beginPath();
            this.staticLayer.moveTo(points[0][0], points[0][1]);

            points.slice(1).forEach(([x, y], pointIndex) => {
              path.lineTo(x, y);
              this.staticLayer.lineTo(x, y);
              const isTerminal = pointIndex === points.length - 2;
              const node = this.add.circle(x, y, isTerminal ? 3.5 : 2.2, color, isTerminal ? 0.7 : 0.35)
                .setStrokeStyle(1, color, 0.6)
                .setBlendMode(PhaserRuntime.BlendModes.ADD);
              this.nodes.push(node);

              if (!this.reducedMotion) {
                this.tweens.add({
                  targets: node,
                  alpha: { from: 0.28, to: 0.9 },
                  scale: { from: 0.85, to: 1.45 },
                  duration: 1200 + pathIndex * 170 + pointIndex * 110,
                  yoyo: true,
                  repeat: -1,
                  ease: "Sine.inOut",
                });
              }
            });
            this.staticLayer.strokePath();
            this.paths.push(path);

            const pulse = this.add.circle(points[0][0], points[0][1], pathIndex % 2 === 0 ? 2.6 : 2, color, 0.95)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.pulses.push(pulse);

            if (!this.reducedMotion) {
              const follower = { progress: 0 };
              this.tweens.add({
                targets: follower,
                progress: 1,
                delay: pathIndex * 460,
                duration: 4200 + pathIndex * 540,
                repeat: -1,
                ease: "Linear",
                onUpdate: () => {
                  const point = path.getPoint(follower.progress);
                  if (point) pulse.setPosition(point.x, point.y);
                },
              });
            }
          });
        }

        private createDataShards(width: number, height: number) {
          const count = width < 760 ? 12 : 26;
          for (let index = 0; index < count; index += 1) {
            const color = index % 5 === 0 ? 0xffcf5a : index % 3 === 0 ? 0x8d6bff : 0x49e6ff;
            const shard = this.add.rectangle(
              PhaserRuntime.Math.Between(0, width),
              PhaserRuntime.Math.Between(0, height),
              PhaserRuntime.Math.Between(1, 2),
              PhaserRuntime.Math.Between(4, 12),
              color,
              PhaserRuntime.Math.FloatBetween(0.12, 0.42),
            ).setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.shards.push(shard);

            if (!this.reducedMotion) {
              this.tweens.add({
                targets: shard,
                y: shard.y - PhaserRuntime.Math.Between(35, 100),
                x: shard.x + PhaserRuntime.Math.Between(-14, 14),
                alpha: { from: shard.alpha, to: 0.03 },
                duration: PhaserRuntime.Math.Between(3600, 7200),
                delay: PhaserRuntime.Math.Between(0, 2400),
                repeat: -1,
                yoyo: true,
                ease: "Sine.inOut",
              });
            }
          }
        }

        private flashDischarge() {
          if (this.paths.length === 0) return;
          const path = PhaserRuntime.Utils.Array.GetRandom(this.paths);
          let flashes = 0;

          this.time.addEvent({
            delay: 55,
            repeat: 4,
            callback: () => {
              this.energyLayer.clear();
              flashes += 1;
              if (flashes % 2 === 0) return;

              const sampleCount = 13;
              this.energyLayer.lineStyle(flashes === 3 ? 2 : 1, 0xdffcff, 0.72);
              this.energyLayer.beginPath();
              for (let index = 0; index < sampleCount; index += 1) {
                const point = path.getPoint(index / (sampleCount - 1));
                if (!point) continue;
                const x = point.x + (index === 0 || index === sampleCount - 1 ? 0 : PhaserRuntime.Math.Between(-3, 3));
                const y = point.y + (index === 0 || index === sampleCount - 1 ? 0 : PhaserRuntime.Math.Between(-3, 3));
                if (index === 0) this.energyLayer.moveTo(x, y);
                else this.energyLayer.lineTo(x, y);
              }
              this.energyLayer.strokePath();
              if (flashes === 5) {
                this.time.delayedCall(70, () => this.energyLayer.clear());
              }
            },
          });
        }

        shutdown() {
          this.dischargeEvent?.destroy();
          this.scale.off("resize", this.rebuild, this);
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
          height: hostRef.current.clientHeight,
        },
        render: { antialias: true, pixelArt: false },
        audio: { noAudio: true },
      });
    }).catch(() => undefined);

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="user-page-phaser-canvas" ref={hostRef} aria-hidden="true" />;
}
