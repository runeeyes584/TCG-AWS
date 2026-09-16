"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

const splashes = [
  { key: "tribe", src: "/splash/tribe.webp" },
  { key: "evoEldlich", src: "/splash/evo-eldlich.webp" },
  { key: "eldlich", src: "/splash/eldlich.webp" },
  { key: "evoTribe", src: "/splash/evo-tribe.webp" },
  { key: "evoRaye", src: "/splash/evo-raye.webp" },
  { key: "evoVaresa", src: "/splash/evo-varesa.webp" },
  { key: "cat-uia", src: "/splash/cat-UIA.webp" },
  { key: "cat-sigma", src: "/splash/cat-sigma.webp" },
];

// Start with the smallest hero artwork so the first visible frame stays
// responsive. The remaining artwork is loaded one item at a time later.
const INITIAL_SPLASH_INDEX = 1;

export function PhaserSplash() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let game: Phaser.Game | undefined;
    let disposed = false;
    let idleId: number | undefined;
    let startTimer: number | undefined;

    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    ) {
      return;
    }

    const start = () => {
      if (disposed) return;
      void import("phaser").then((mod) => {
      const PhaserRuntime = (mod as any).default || mod;
      if (disposed || !hostRef.current) return;

      class LobbySplashScene extends PhaserRuntime.Scene {
        private current?: Phaser.GameObjects.Image;
        private splashIndex = INITIAL_SPLASH_INDEX - 1;
        private loadingSplashKey?: string;
        private backgroundGlow?: Phaser.GameObjects.Arc;
        private staticLayer!: Phaser.GameObjects.Graphics;
        private energyLayer!: Phaser.GameObjects.Graphics;
        private shards: Phaser.GameObjects.Rectangle[] = [];
        private nodes: Phaser.GameObjects.Arc[] = [];
        private pulses: Phaser.GameObjects.Arc[] = [];
        private paths: Phaser.Curves.Path[] = [];
        private reducedMotion = false;
        private switchTimer?: Phaser.Time.TimerEvent;
        private dischargeTimer?: Phaser.Time.TimerEvent;

        constructor() {
          super("lobby-splash-enhanced");
        }

        preload() {
          const initialSplash = splashes[INITIAL_SPLASH_INDEX];
          if (!this.textures.exists(initialSplash.key)) {
            this.load.image(initialSplash.key, initialSplash.src);
          }
        }

        create() {
          this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          this.staticLayer = this.add.graphics();
          this.energyLayer = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.rebuildLayers();
          this.showNextSplash();

          this.switchTimer = this.time.addEvent({
            delay: 6500,
            loop: true,
            callback: this.showNextSplash,
            callbackScope: this,
          });

          if (!this.reducedMotion) {
            this.dischargeTimer = this.time.addEvent({
              delay: 3200,
              loop: true,
              callback: this.flashDischarge,
              callbackScope: this,
            });
          }

          this.scale.on("resize", this.handleResize, this);
        }

        private rebuildLayers() {
          this.shards.forEach((s) => {
            this.tweens.killTweensOf(s);
            s.destroy();
          });
          this.nodes.forEach((n) => {
            this.tweens.killTweensOf(n);
            n.destroy();
          });
          this.pulses.forEach((p) => {
            this.tweens.killTweensOf(p);
            p.destroy();
          });
          this.shards = [];
          this.nodes = [];
          this.pulses = [];
          this.paths = [];
          this.staticLayer.clear();
          this.energyLayer.clear();

          const { width, height } = this.scale;
          if (width <= 0 || height <= 0) return;

          this.createBackgroundAura(width, height);
          this.createRunicCircuits(width, height);
          this.createEtherParticles(width, height);
        }

        private createBackgroundAura(width: number, height: number) {
          const isMobile = width < 768;
          const focusX = isMobile ? width * 0.5 : width * 0.72;
          const focusY = height * 0.55;
          const radius = Math.min(width, height) * 0.45;

          if (this.backgroundGlow) {
            this.tweens.killTweensOf(this.backgroundGlow);
            this.backgroundGlow.destroy();
          }

          this.backgroundGlow = this.add.circle(focusX, focusY, radius, 0x49e6ff, 0.05)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);

          if (!this.reducedMotion) {
            this.tweens.add({
              targets: this.backgroundGlow,
              scale: { from: 0.9, to: 1.18 },
              alpha: { from: 0.04, to: 0.09 },
              duration: 4800,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          }
        }

        private createRunicCircuits(width: number, height: number) {
          const isMobile = width < 768;
          const circuits = isMobile
            ? [
                [[width * 0.1, height * 0.15], [width * 0.4, height * 0.15], [width * 0.55, height * 0.3], [width * 0.55, height * 0.6]],
                [[width * 0.9, height * 0.85], [width * 0.6, height * 0.85], [width * 0.45, height * 0.7], [width * 0.45, height * 0.4]],
              ]
            : [
                [[width * 0.35, height * 0.1], [width * 0.55, height * 0.1], [width * 0.65, height * 0.22], [width * 0.85, height * 0.22]],
                [[width * 0.4, height * 0.9], [width * 0.6, height * 0.9], [width * 0.7, height * 0.78], [width * 0.92, height * 0.78]],
                [[width * 0.95, height * 0.35], [width * 0.82, height * 0.35], [width * 0.75, height * 0.48], [width * 0.75, height * 0.65]],
              ];

          circuits.forEach((points, pathIndex) => {
            const color = pathIndex % 2 === 0 ? 0x49e6ff : 0x8d6bff;
            const path = new PhaserRuntime.Curves.Path(points[0][0], points[0][1]);
            this.staticLayer.lineStyle(1, color, 0.12);
            this.staticLayer.beginPath();
            this.staticLayer.moveTo(points[0][0], points[0][1]);

            points.slice(1).forEach(([x, y], ptIdx) => {
              path.lineTo(x, y);
              this.staticLayer.lineTo(x, y);

              const isTerminal = ptIdx === points.length - 2;
              const node = this.add.circle(x, y, isTerminal ? 3 : 1.8, color, isTerminal ? 0.65 : 0.25)
                .setStrokeStyle(1, color, 0.5)
                .setBlendMode(PhaserRuntime.BlendModes.ADD);
              this.nodes.push(node);

              if (!this.reducedMotion) {
                this.tweens.add({
                  targets: node,
                  alpha: { from: 0.2, to: 0.85 },
                  scale: { from: 0.85, to: 1.35 },
                  duration: 1500 + ptIdx * 180,
                  yoyo: true,
                  repeat: -1,
                  ease: "Sine.inOut",
                });
              }
            });
            this.staticLayer.strokePath();
            this.paths.push(path);

            const pulse = this.add.circle(points[0][0], points[0][1], 2.2, color, 0.9)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.pulses.push(pulse);

            if (!this.reducedMotion) {
              const follower = { progress: 0 };
              this.tweens.add({
                targets: follower,
                progress: 1,
                delay: pathIndex * 600,
                duration: 4500 + pathIndex * 600,
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

        private createEtherParticles(width: number, height: number) {
          const isMobile = width < 768;
          const count = isMobile ? 18 : 36;

          for (let index = 0; index < count; index += 1) {
            const colorPalette = [0x49e6ff, 0x8d6bff, 0xffcf5a, 0xff2d55];
            const color = colorPalette[index % colorPalette.length];
            const shard = this.add.rectangle(
              PhaserRuntime.Math.Between(Math.floor(isMobile ? 0 : width * 0.25), width),
              PhaserRuntime.Math.Between(0, height),
              PhaserRuntime.Math.Between(2, 4),
              PhaserRuntime.Math.Between(8, 22),
              color,
              PhaserRuntime.Math.FloatBetween(0.12, 0.45)
            ).setBlendMode(PhaserRuntime.BlendModes.ADD);

            shard.setRotation(PhaserRuntime.Math.DegToRad(PhaserRuntime.Math.Between(-35, 35)));
            this.shards.push(shard);

            if (!this.reducedMotion) {
              this.tweens.add({
                targets: shard,
                y: shard.y - PhaserRuntime.Math.Between(40, 110),
                x: shard.x + PhaserRuntime.Math.Between(-15, 15),
                alpha: { from: shard.alpha, to: 0.02 },
                angle: shard.angle + PhaserRuntime.Math.Between(-30, 30),
                duration: PhaserRuntime.Math.Between(2600, 6200),
                delay: PhaserRuntime.Math.Between(0, 2000),
                repeat: -1,
                yoyo: true,
                ease: "Sine.inOut",
              });
            }
          }
        }

        private showNextSplash() {
          this.splashIndex = (this.splashIndex + 1) % splashes.length;
          const splash = splashes[this.splashIndex];

          if (!this.textures.exists(splash.key)) {
            if (this.loadingSplashKey === splash.key) return;
            this.loadingSplashKey = splash.key;
            this.load.once("complete", () => {
              this.loadingSplashKey = undefined;
              if (!this.scene.isActive()) return;
              this.renderSplash(splash);
            });
            this.load.image(splash.key, splash.src);
            this.load.start();
            return;
          }

          this.renderSplash(splash);
        }

        private renderSplash(splash: (typeof splashes)[number]) {
          const previous = this.current;
          const { width, height } = this.scale;
          const isMobile = width < 768;

          const targetX = isMobile ? width * 0.62 : width * 0.72;
          const targetY = height * 0.55;

          const next = this.add.image(targetX, targetY, splash.key)
            .setAlpha(0)
            .setScale(0.8);

          this.current = next;
          this.layoutImage(next);

          const baseScale = next.scaleX;
          next.setScale(baseScale * 0.92);

          this.tweens.add({
            targets: next,
            alpha: { from: 0, to: 0.95 },
            scaleX: baseScale,
            scaleY: baseScale,
            duration: 1200,
            ease: "Cubic.out",
          });

          // Gentle breathing idle for the active hero art
          if (!this.reducedMotion) {
            this.tweens.add({
              targets: next,
              scaleX: baseScale * 1.02,
              scaleY: baseScale * 1.02,
              duration: 3500,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
              delay: 1200,
            });
          }

          if (previous) {
            this.tweens.killTweensOf(previous);
            this.tweens.add({
              targets: previous,
              alpha: 0,
              scaleX: previous.scaleX * 0.92,
              scaleY: previous.scaleY * 0.92,
              duration: 800,
              ease: "Cubic.in",
              onComplete: () => previous.destroy(),
            });
          }
        }

        private flashDischarge() {
          if (this.paths.length === 0) return;
          const path = PhaserRuntime.Utils.Array.GetRandom(this.paths);
          let flashes = 0;

          this.time.addEvent({
            delay: 50,
            repeat: 4,
            callback: () => {
              this.energyLayer.clear();
              flashes += 1;
              if (flashes % 2 === 0) return;

              const sampleCount = 10;
              this.energyLayer.lineStyle(flashes === 3 ? 2 : 1, 0xc5f7ff, 0.75);
              this.energyLayer.beginPath();

              for (let idx = 0; idx < sampleCount; idx += 1) {
                const pt = path.getPoint(idx / (sampleCount - 1));
                if (!pt) continue;
                const jitterX = idx === 0 || idx === sampleCount - 1 ? 0 : PhaserRuntime.Math.Between(-3, 3);
                const jitterY = idx === 0 || idx === sampleCount - 1 ? 0 : PhaserRuntime.Math.Between(-3, 3);
                if (idx === 0) this.energyLayer.moveTo(pt.x + jitterX, pt.y + jitterY);
                else this.energyLayer.lineTo(pt.x + jitterX, pt.y + jitterY);
              }
              this.energyLayer.strokePath();

              if (flashes === 5) {
                this.time.delayedCall(60, () => this.energyLayer.clear());
              }
            },
          });
        }

        private layoutImage(image: Phaser.GameObjects.Image) {
          const { width, height } = this.scale;
          const isMobile = width < 768;
          const scale = Math.min(
            (isMobile ? width * 1.1 : width * 0.76) / (image.width || 800),
            (height * 0.96) / (image.height || 1000)
          );
          image
            .setPosition(isMobile ? width * 0.62 : width * 0.72, height * 0.55)
            .setScale(scale);
        }

        private handleResize() {
          this.rebuildLayers();
          if (this.current) this.layoutImage(this.current);
        }

        shutdown() {
          this.switchTimer?.destroy();
          this.dischargeTimer?.destroy();
          this.scale.off("resize", this.handleResize, this);
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.WEBGL,
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
        fps: { target: 30, min: 20 },
        audio: { noAudio: true },
      });
      }).catch(() => undefined);
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(start, { timeout: 1200 });
    } else {
      startTimer = window.setTimeout(start, 250);
    }

    return () => {
      disposed = true;
      if (idleId !== undefined) idleWindow.cancelIdleCallback?.(idleId);
      if (startTimer !== undefined) window.clearTimeout(startTimer);
      game?.destroy(true);
    };
  }, []);

  return <div className="lobby-splash" ref={hostRef} aria-hidden="true" />;
}
