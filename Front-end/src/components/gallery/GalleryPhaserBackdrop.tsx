"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

const shardColors = [0x75e6ff, 0xc9f25d, 0xb98cff, 0xffcf6b];

export function GalleryPhaserBackdrop() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then(({ default: PhaserRuntime }) => {
      if (disposed || !hostRef.current) return;

      class GalleryScene extends PhaserRuntime.Scene {
        private rings: Phaser.GameObjects.Arc[] = [];
        private scan?: Phaser.GameObjects.Rectangle;
        private grid?: Phaser.GameObjects.Graphics;

        constructor() {
          super("card-gallery-backdrop");
        }

        create() {
          this.cameras.main.setBackgroundColor("rgba(0,0,0,0)");
          this.drawGrid();
          this.createArchiveCore();
          this.createShards();
          this.scale.on("resize", this.relayout, this);
        }

        private drawGrid() {
          const { width, height } = this.scale;
          this.grid?.destroy();
          const grid = this.add.graphics();
          grid.lineStyle(1, 0x79dfff, 0.08);

          for (let x = 0; x < width; x += 56) {
            grid.lineBetween(x, 0, x + height * 0.38, height);
          }

          grid.lineStyle(1, 0xc8f36a, 0.06);
          for (let y = 0; y < height; y += 48) {
            grid.lineBetween(0, y, width, y - width * 0.12);
          }

          this.grid = grid;
        }

        private createArchiveCore() {
          const { width, height } = this.scale;
          const x = width * 0.76;
          const y = height * 0.46;
          const radius = Math.min(width, height) * 0.22;

          for (let index = 0; index < 4; index += 1) {
            const ring = this.add.arc(
              x,
              y,
              radius + index * 34,
              0,
              340 - index * 28,
              false,
              shardColors[index],
              0.13
            );
            ring.setStrokeStyle(index === 0 ? 3 : 2, shardColors[index], 0.28 - index * 0.035);
            this.rings.push(ring);
            this.tweens.add({
              targets: ring,
              angle: index % 2 === 0 ? 360 : -360,
              duration: 12000 + index * 2200,
              repeat: -1,
              ease: "Linear",
            });
          }

          const pulse = this.add.circle(x, y, radius * 0.22, 0x75e6ff, 0.12);
          this.tweens.add({
            targets: pulse,
            alpha: 0.28,
            scale: 1.4,
            duration: 1900,
            repeat: -1,
            yoyo: true,
            ease: "Sine.inOut",
          });

          this.scan = this.add.rectangle(width * 0.5, -40, width, 2, 0xc9f25d, 0.35);
          this.tweens.add({
            targets: this.scan,
            y: height + 40,
            duration: 3400,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        private createShards() {
          const { width, height } = this.scale;

          for (let index = 0; index < 28; index += 1) {
            const color = shardColors[index % shardColors.length];
            const shard = this.add.rectangle(
              PhaserRuntime.Math.Between(0, width),
              PhaserRuntime.Math.Between(0, height),
              PhaserRuntime.Math.Between(2, 7),
              PhaserRuntime.Math.Between(10, 28),
              color,
              PhaserRuntime.Math.FloatBetween(0.08, 0.34)
            );

            shard.setRotation(PhaserRuntime.Math.DegToRad(PhaserRuntime.Math.Between(-50, 50)));
            this.tweens.add({
              targets: shard,
              x: shard.x + PhaserRuntime.Math.Between(-42, 42),
              y: shard.y - PhaserRuntime.Math.Between(35, 110),
              alpha: PhaserRuntime.Math.FloatBetween(0.03, 0.18),
              angle: shard.angle + PhaserRuntime.Math.Between(-80, 80),
              duration: PhaserRuntime.Math.Between(2600, 6200),
              delay: PhaserRuntime.Math.Between(0, 2200),
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut",
            });
          }
        }

        private relayout() {
          this.drawGrid();
          this.rings.forEach((ring, index) => {
            const { width, height } = this.scale;
            const radius = Math.min(width, height) * 0.22;
            ring.setPosition(width * 0.76, height * 0.46).setRadius(radius + index * 34);
          });
          this.scan?.setSize(this.scale.width, 2);
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: hostRef.current,
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scene: GalleryScene,
        scale: {
          mode: PhaserRuntime.Scale.RESIZE,
          width: hostRef.current.clientWidth,
          height: hostRef.current.clientHeight,
        },
        render: { antialias: true, pixelArt: false },
        fps: { target: 30, min: 20 },
        audio: { noAudio: true },
      });
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="gallery-phaser-backdrop" ref={hostRef} aria-hidden="true" />;
}
