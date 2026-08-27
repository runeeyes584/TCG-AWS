"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

export function PhaserSearchingVortex() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then((mod) => {
      const PhaserRuntime = (mod as any).default || mod;
      if (disposed || !hostRef.current) return;

      class SearchingVortexScene extends PhaserRuntime.Scene {
        private staticLayer!: Phaser.GameObjects.Graphics;
        private energyLayer!: Phaser.GameObjects.Graphics;
        private vortexParticles: Phaser.GameObjects.Arc[] = [];
        private scannerRings: Phaser.GameObjects.Arc[] = [];
        private lightningTimer?: Phaser.Time.TimerEvent;

        constructor() {
          super("searching-vortex-scene");
        }

        create() {
          this.staticLayer = this.add.graphics();
          this.energyLayer = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.rebuildVortex();
          this.scale.on("resize", this.rebuildVortex, this);

          this.lightningTimer = this.time.addEvent({
            delay: 1600,
            loop: true,
            callback: this.flashVortexLightning,
            callbackScope: this,
          });
        }

        private rebuildVortex() {
          this.vortexParticles.forEach((p) => {
            this.tweens.killTweensOf(p);
            p.destroy();
          });
          this.scannerRings.forEach((r) => {
            this.tweens.killTweensOf(r);
            r.destroy();
          });
          this.vortexParticles = [];
          this.scannerRings = [];
          this.staticLayer.clear();
          this.energyLayer.clear();

          const { width, height } = this.scale;
          if (width <= 0 || height <= 0) return;

          const cx = width / 2;
          const cy = height / 2;
          const maxRadius = Math.min(width, height) * 0.38;

          // 1. Concentric Sonar Rings
          const ringRadii = [maxRadius * 0.3, maxRadius * 0.55, maxRadius * 0.8, maxRadius * 1.05];
          ringRadii.forEach((radius, idx) => {
            const color = idx % 2 === 0 ? 0x00f0ff : 0xa855f7;
            const ring = this.add.circle(cx, cy, radius, color, 0)
              .setStrokeStyle(1.5, color, 0.35)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.scannerRings.push(ring);

            this.tweens.add({
              targets: ring,
              scale: { from: 0.94, to: 1.06 },
              alpha: { from: 0.2, to: 0.65 },
              duration: 2000 + idx * 400,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          });

          // 2. Swirling Vortex Singularity Particles (Abyssal Rift)
          const particleCount = 48;
          for (let i = 0; i < particleCount; i += 1) {
            const initialRadius = PhaserRuntime.Math.Between(maxRadius * 0.2, maxRadius * 1.2);
            const initialAngle = (Math.PI * 2 * i) / particleCount;
            const colors = [0x00f0ff, 0x8d6bff, 0xff0055, 0xffd700];
            const color = colors[i % colors.length];

            const p = this.add.circle(
              cx + Math.cos(initialAngle) * initialRadius,
              cy + Math.sin(initialAngle) * initialRadius,
              PhaserRuntime.Math.Between(2, 4),
              color,
              PhaserRuntime.Math.FloatBetween(0.4, 0.95)
            ).setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.vortexParticles.push(p);

            const orbit = {
              radius: initialRadius,
              angle: initialAngle,
            };

            // Inward spiral animation
            this.tweens.add({
              targets: orbit,
              radius: { from: initialRadius, to: maxRadius * 0.1 },
              angle: initialAngle + Math.PI * 4,
              duration: PhaserRuntime.Math.Between(2800, 5600),
              repeat: -1,
              ease: "Cubic.in",
              onUpdate: () => {
                p.setPosition(
                  cx + Math.cos(orbit.angle) * orbit.radius,
                  cy + Math.sin(orbit.angle) * orbit.radius
                );
                p.setAlpha((orbit.radius / maxRadius) * 0.9);
              },
            });
          }

          // 3. Central singularity glow
          const coreGlow = this.add.circle(cx, cy, maxRadius * 0.18, 0x8d6bff, 0.12)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);
          this.vortexParticles.push(coreGlow);

          this.tweens.add({
            targets: coreGlow,
            scale: { from: 0.8, to: 1.4 },
            alpha: { from: 0.08, to: 0.25 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        private flashVortexLightning() {
          const { width, height } = this.scale;
          if (width <= 0 || height <= 0) return;

          const cx = width / 2;
          const cy = height / 2;
          const maxRadius = Math.min(width, height) * 0.35;

          const angle = PhaserRuntime.Math.FloatBetween(0, Math.PI * 2);
          const startX = cx + Math.cos(angle) * maxRadius;
          const startY = cy + Math.sin(angle) * maxRadius;

          let flashes = 0;
          this.time.addEvent({
            delay: 45,
            repeat: 3,
            callback: () => {
              this.energyLayer.clear();
              flashes += 1;
              if (flashes % 2 === 0) return;

              const segments = 8;
              this.energyLayer.lineStyle(1.8, 0x00f0ff, 0.85);
              this.energyLayer.beginPath();
              this.energyLayer.moveTo(startX, startY);

              for (let i = 1; i <= segments; i += 1) {
                const t = i / segments;
                const tx = PhaserRuntime.Math.Linear(startX, cx, t) + PhaserRuntime.Math.Between(-8, 8);
                const ty = PhaserRuntime.Math.Linear(startY, cy, t) + PhaserRuntime.Math.Between(-8, 8);
                this.energyLayer.lineTo(tx, ty);
              }
              this.energyLayer.strokePath();

              if (flashes === 3) {
                this.time.delayedCall(60, () => this.energyLayer.clear());
              }
            },
          });
        }

        shutdown() {
          this.lightningTimer?.destroy();
          this.scale.off("resize", this.rebuildVortex, this);
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: hostRef.current,
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scene: SearchingVortexScene,
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

  return <div className="phaser-searching-vortex" ref={hostRef} aria-hidden="true" />;
}
