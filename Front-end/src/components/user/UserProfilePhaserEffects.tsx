"use client";

import { useEffect, useRef } from "react";
import type Phaser from "phaser";

export function UserProfilePhaserEffects() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then(({ default: PhaserRuntime }) => {
      if (disposed || !hostRef.current) return;

      class UserProfileScene extends PhaserRuntime.Scene {
        private nodes: Phaser.GameObjects.Arc[] = [];
        private electricGraphics?: Phaser.GameObjects.Graphics;
        private nodePositions: { x: number; y: number }[] = [];

        constructor() {
          super("user-profile-effects");
        }

        create() {
          const { width, height } = this.scale;
          this.electricGraphics = this.add.graphics();

          this.createCyberGrid();
          this.createEnergyNodes(width, height);
          this.createFloatingPowerParticles(width, height);
          this.createCentralPowerAura(width, height);

          // Electric arc flickering timer
          this.time.addEvent({
            delay: 180,
            loop: true,
            callback: this.drawElectricArcs,
            callbackScope: this,
          });

          this.scale.on("resize", this.handleResize, this);
        }

        private createCyberGrid() {
          const graphics = this.add.graphics().setAlpha(0.25);
          graphics.lineStyle(1, 0xffd700, 0.18);

          const stepX = 90;
          const stepY = 80;
          const { width, height } = this.scale;

          for (let x = 0; x < width; x += stepX) {
            graphics.beginPath();
            graphics.moveTo(x, 0);
            graphics.lineTo(x + 30, height);
            graphics.strokePath();
          }

          for (let y = 0; y < height; y += stepY) {
            graphics.beginPath();
            graphics.moveTo(0, y);
            graphics.lineTo(width, y + 20);
            graphics.strokePath();
          }
        }

        private createEnergyNodes(width: number, height: number) {
          const count = 12;
          this.nodePositions = [];

          for (let i = 0; i < count; i += 1) {
            const x = PhaserRuntime.Math.Between(Math.floor(width * 0.1), Math.floor(width * 0.9));
            const y = PhaserRuntime.Math.Between(Math.floor(height * 0.15), Math.floor(height * 0.85));
            this.nodePositions.push({ x, y });

            const isGold = i % 2 === 0;
            const color = isGold ? 0xffd700 : 0x00e1ff;

            const node = this.add.circle(x, y, PhaserRuntime.Math.Between(3, 6), color, 0.6)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);

            const glow = this.add.circle(x, y, PhaserRuntime.Math.Between(10, 20), color, 0.15)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);

            this.nodes.push(node);

            this.tweens.add({
              targets: [node, glow],
              scale: 1.6,
              alpha: 0.8,
              duration: PhaserRuntime.Math.Between(1500, 3000),
              delay: PhaserRuntime.Math.Between(0, 1000),
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut",
            });
          }
        }

        private createFloatingPowerParticles(width: number, height: number) {
          const particleCount = 35;

          for (let i = 0; i < particleCount; i += 1) {
            const isGold = i % 3 === 0;
            const color = isGold ? 0xffd700 : 0x00e1ff;

            const particle = this.add.rectangle(
              PhaserRuntime.Math.Between(0, width),
              PhaserRuntime.Math.Between(0, height),
              PhaserRuntime.Math.Between(2, 4),
              PhaserRuntime.Math.Between(6, 16),
              color,
              PhaserRuntime.Math.FloatBetween(0.2, 0.65)
            ).setBlendMode(PhaserRuntime.BlendModes.ADD);

            particle.setRotation(PhaserRuntime.Math.DegToRad(PhaserRuntime.Math.Between(-30, 30)));

            this.tweens.add({
              targets: particle,
              y: particle.y - PhaserRuntime.Math.Between(40, 120),
              alpha: 0.05,
              scaleX: 0.5,
              duration: PhaserRuntime.Math.Between(2500, 5000),
              delay: PhaserRuntime.Math.Between(0, 2000),
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut",
            });
          }
        }

        private createCentralPowerAura(width: number, height: number) {
          const cx = width * 0.5;
          const cy = height * 0.45;

          const outerRing = this.add.circle(cx, cy, Math.min(width, height) * 0.35, 0xffd700, 0.015)
            .setStrokeStyle(1, 0xffd700, 0.25)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);

          const innerRing = this.add.circle(cx, cy, Math.min(width, height) * 0.25, 0x00e1ff, 0.02)
            .setStrokeStyle(1, 0x00e1ff, 0.3)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.tweens.add({
            targets: outerRing,
            scale: 1.12,
            alpha: 0.35,
            duration: 3200,
            repeat: -1,
            yoyo: true,
            ease: "Sine.inOut",
          });

          this.tweens.add({
            targets: innerRing,
            scale: 0.9,
            alpha: 0.45,
            duration: 2400,
            repeat: -1,
            yoyo: true,
            ease: "Sine.inOut",
          });
        }

        private drawElectricArcs() {
          if (!this.electricGraphics || this.nodePositions.length < 2) return;

          this.electricGraphics.clear();

          // Randomly draw 2-4 electrical arcs between adjacent node pairs
          const arcCount = PhaserRuntime.Math.Between(2, 4);

          for (let i = 0; i < arcCount; i += 1) {
            const idxA = PhaserRuntime.Math.Between(0, this.nodePositions.length - 1);
            let idxB = PhaserRuntime.Math.Between(0, this.nodePositions.length - 1);
            if (idxA === idxB) idxB = (idxA + 1) % this.nodePositions.length;

            const pA = this.nodePositions[idxA];
            const pB = this.nodePositions[idxB];

            // Only draw arc if nodes are reasonably close
            const dist = PhaserRuntime.Math.Distance.Between(pA.x, pA.y, pB.x, pB.y);
            if (dist > 350) continue;

            const isGold = i % 2 === 0;
            const strokeColor = isGold ? 0xffd700 : 0x00e1ff;
            const alpha = PhaserRuntime.Math.FloatBetween(0.35, 0.85);

            this.electricGraphics.lineStyle(1.5, strokeColor, alpha);
            this.electricGraphics.beginPath();
            this.electricGraphics.moveTo(pA.x, pA.y);

            // Jitter midpoint for electric arc effect
            const midX = (pA.x + pB.x) / 2 + PhaserRuntime.Math.Between(-15, 15);
            const midY = (pA.y + pB.y) / 2 + PhaserRuntime.Math.Between(-15, 15);

            this.electricGraphics.lineTo(midX, midY);
            this.electricGraphics.lineTo(pB.x, pB.y);
            this.electricGraphics.strokePath();
          }
        }

        private handleResize() {
          if (this.electricGraphics) {
            this.electricGraphics.clear();
          }
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
    });

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="user-profile-phaser-effects" ref={hostRef} aria-hidden="true" />;
}
