"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";
import aoi from "../../assets/heros/aoi.png";
import eldlich from "../../assets/heros/eldlich.png";
import gaia from "../../assets/heros/gaia.png";
import laevan from "../../assets/heros/laevan.png";
import raye from "../../assets/heros/raye.png";
import varesa from "../../assets/heros/varesa.png";

const splashes = [
  { key: "aoi", src: aoi.src },
  { key: "eldlich", src: eldlich.src },
  { key: "gaia", src: gaia.src },
  { key: "laevan", src: laevan.src },
  { key: "raye", src: raye.src },
  { key: "varesa", src: varesa.src },
];

export function PhaserSplash() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then(({ default: PhaserRuntime }) => {
      if (disposed || !hostRef.current) return;

      class LobbySplashScene extends PhaserRuntime.Scene {
        private current?: Phaser.GameObjects.Image;
        private splashIndex = -1;

        constructor() {
          super("lobby-splash");
        }

        preload() {
          splashes.forEach((splash) => this.load.image(splash.key, splash.src));
        }

        create() {
          this.createShards();
          this.showNextSplash();
          this.time.addEvent({ delay: 6000, loop: true, callback: this.showNextSplash, callbackScope: this });
          this.scale.on("resize", this.layoutSplash, this);
        }

        private createShards() {
          const { width, height } = this.scale;

          for (let index = 0; index < 24; index += 1) {
            const shard = this.add.rectangle(
              PhaserRuntime.Math.Between(Math.floor(width * 0.35), width),
              PhaserRuntime.Math.Between(0, height),
              PhaserRuntime.Math.Between(2, 5),
              PhaserRuntime.Math.Between(8, 20),
              index % 3 === 0 ? 0xb870ff : 0x74ddff,
              PhaserRuntime.Math.FloatBetween(0.12, 0.48)
            );
            shard.setRotation(PhaserRuntime.Math.DegToRad(PhaserRuntime.Math.Between(-35, 35)));

            this.tweens.add({
              targets: shard,
              y: shard.y - PhaserRuntime.Math.Between(30, 100),
              alpha: 0.04,
              angle: shard.angle + PhaserRuntime.Math.Between(-45, 45),
              duration: PhaserRuntime.Math.Between(2300, 5200),
              delay: PhaserRuntime.Math.Between(0, 1800),
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut",
            });
          }
        }

        private showNextSplash() {
          this.splashIndex = (this.splashIndex + 1) % splashes.length;
          const previous = this.current;
          const { width, height } = this.scale;
          const next = this.add.image(width * 0.71, height * 0.55, splashes[this.splashIndex].key)
            .setAlpha(0)
            .setScale(0.8);

          this.current = next;
          this.layoutImage(next);
          next.setScale(next.scaleX * 0.87, next.scaleY * 0.87);

          this.tweens.add({
            targets: next,
            alpha: 1,
            scaleX: next.scaleX / 0.87,
            scaleY: next.scaleY / 0.87,
            duration: 1050,
            ease: "Cubic.out",
          });

          if (previous) {
            this.tweens.add({
              targets: previous,
              alpha: 0,
              scaleX: previous.scaleX * 0.9,
              scaleY: previous.scaleY * 0.9,
              duration: 700,
              ease: "Cubic.in",
              onComplete: () => previous.destroy(),
            });
          }
        }

        private layoutImage(image: Phaser.GameObjects.Image) {
          const { width, height } = this.scale;
          const isMobile = width < 680;
          const scale = Math.min((isMobile ? width * 1.15 : width * 0.78) / image.width, height * 0.98 / image.height);
          image.setPosition(isMobile ? width * 0.63 : width * 0.72, height * 0.56).setScale(scale);
        }

        private layoutSplash() {
          if (this.current) this.layoutImage(this.current);
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: hostRef.current,
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scene: LobbySplashScene,
        scale: {
          mode: PhaserRuntime.Scale.RESIZE,
          width: hostRef.current.clientWidth,
          height: hostRef.current.clientHeight,
        },
        render: { antialias: true, pixelArt: false },
      });
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="lobby-splash" ref={hostRef} aria-hidden="true" />;
}
