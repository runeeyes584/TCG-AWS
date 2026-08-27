"use client";

import { useEffect, useRef, memo } from "react";
import type Phaser from "phaser";

interface MatchAvatarFrameProps {
  avatarUrl?: string;
  name?: string;
  size?: "sm" | "md" | "lg" | "xl";
  theme?: "cyan" | "crimson" | "gold" | "violet";
  className?: string;
  showHalo?: boolean;
}

export const MatchAvatarFrame = memo(function MatchAvatarFrame({
  avatarUrl,
  name = "Operative",
  size = "md",
  theme = "cyan",
  className = "",
  showHalo = true,
}: MatchAvatarFrameProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const initial = (name[0] || "P").toUpperCase();

  useEffect(() => {
    if (!showHalo || !canvasRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;
    let timerId: ReturnType<typeof setTimeout>;

    timerId = setTimeout(() => {
      if (disposed || !canvasRef.current) return;

      void import("phaser").then((mod) => {
        const PhaserRuntime = (mod as any).default || mod;
        if (disposed || !canvasRef.current) return;

      const sizeMap = { sm: 54, md: 76, lg: 96, xl: 132 };
      const dim = sizeMap[size] || 76;
      const colorMap = {
        cyan: { primary: 0x00f0ff, secondary: 0x49e6ff, accent: 0xffd700, energy: 0x8d6bff, electric: 0xdffcff },
        crimson: { primary: 0xff0055, secondary: 0xff4d7e, accent: 0xffd700, energy: 0xff9900, electric: 0xffd2df },
        gold: { primary: 0xffd700, secondary: 0xffea85, accent: 0x00f0ff, energy: 0xffa500, electric: 0xfff8d6 },
        violet: { primary: 0xa855f7, secondary: 0xc084fc, accent: 0x00f0ff, energy: 0xec4899, electric: 0xf3e8ff },
      };
      const colors = colorMap[theme] || colorMap.cyan;

      class FullAvatarPhaserScene extends PhaserRuntime.Scene {
        private staticLayer!: Phaser.GameObjects.Graphics;
        private energyLayer!: Phaser.GameObjects.Graphics;
        private lightningLayer!: Phaser.GameObjects.Graphics;
        private ring!: Phaser.GameObjects.Arc;
        private outerRing!: Phaser.GameObjects.Arc;
        private nodes: Phaser.GameObjects.Arc[] = [];
        private particles: Phaser.GameObjects.Arc[] = [];
        private shards: Phaser.GameObjects.Rectangle[] = [];
        private circuitPaths: Phaser.Curves.Path[] = [];
        private dischargeTimer?: Phaser.Time.TimerEvent;

        constructor() {
          super({ key: `avatar-full-vfx-${Math.random()}` });
        }

        create() {
          const center = dim / 2;
          const radius = dim * 0.44;

          this.staticLayer = this.add.graphics();
          this.energyLayer = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);
          this.lightningLayer = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);

          // 1. Atmosphere Radial Circuit Ticks (16 Ticks - Inherited from UserProfilePhaserEffects)
          const tickCount = 16;
          for (let i = 0; i < tickCount; i += 1) {
            const angle = (Math.PI * 2 * i) / tickCount;
            const isMajor = i % 2 === 0;
            const inner = radius * (isMajor ? 0.94 : 1.06);
            const outer = inner + (isMajor ? (i % 4 === 0 ? 8 : 5) : 4);
            const tickColor = i % 4 === 0 ? colors.accent : colors.secondary;
            this.staticLayer.lineStyle(1, tickColor, isMajor ? 0.28 : 0.15);
            this.staticLayer.beginPath();
            this.staticLayer.moveTo(center + Math.cos(angle) * inner, center + Math.sin(angle) * inner);
            this.staticLayer.lineTo(center + Math.cos(angle) * outer, center + Math.sin(angle) * outer);
            this.staticLayer.strokePath();
          }

          // 2. Micro-Circuit Traces with Glowing End Nodes
          const circuitAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
          circuitAngles.forEach((baseAngle, idx) => {
            const startR = radius * 1.02;
            const midR = radius * 1.14;
            const endR = radius * 1.24;
            const x0 = center + Math.cos(baseAngle) * startR;
            const y0 = center + Math.sin(baseAngle) * startR;
            const x1 = center + Math.cos(baseAngle + 0.1) * midR;
            const y1 = center + Math.sin(baseAngle + 0.1) * midR;
            const x2 = center + Math.cos(baseAngle + 0.22) * endR;
            const y2 = center + Math.sin(baseAngle + 0.22) * endR;

            const path = new PhaserRuntime.Curves.Path(x0, y0);
            path.lineTo(x1, y1);
            path.lineTo(x2, y2);
            this.circuitPaths.push(path);

            this.staticLayer.lineStyle(1, colors.secondary, 0.2);
            this.staticLayer.beginPath();
            this.staticLayer.moveTo(x0, y0);
            this.staticLayer.lineTo(x1, y1);
            this.staticLayer.lineTo(x2, y2);
            this.staticLayer.strokePath();

            // Terminal Glowing Node
            const node = this.add.circle(x2, y2, 1.8, colors.primary, 0.8)
              .setStrokeStyle(1, colors.accent, 0.6)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.nodes.push(node);

            this.tweens.add({
              targets: node,
              alpha: { from: 0.3, to: 1 },
              scale: { from: 0.8, to: 1.4 },
              duration: 1000 + idx * 250,
              yoyo: true,
              repeat: -1,
              ease: "Sine.inOut",
            });
          });

          // 3. Static Multi-Layer Ambient Halo
          this.staticLayer.lineStyle(1, colors.primary, 0.2);
          this.staticLayer.strokeCircle(center, center, radius * 1.06);
          this.staticLayer.lineStyle(1, colors.energy, 0.12);
          this.staticLayer.strokeCircle(center, center, radius * 1.2);

          // 4. Inner Breathing Energy Ring
          this.ring = this.add.circle(center, center, radius, colors.primary, 0)
            .setStrokeStyle(1.8, colors.primary, 0.7)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.tweens.add({
            targets: this.ring,
            scale: { from: 0.96, to: 1.04 },
            alpha: { from: 0.45, to: 0.95 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          // 5. Outer Pulse Ring
          this.outerRing = this.add.circle(center, center, radius * 1.1, colors.secondary, 0)
            .setStrokeStyle(1, colors.secondary, 0.35)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.tweens.add({
            targets: this.outerRing,
            scale: { from: 1, to: 1.12 },
            alpha: { from: 0.2, to: 0.55 },
            duration: 2600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });

          // 6. Floating Crystal Data Shards (Inherited from UserProfilePhaserEffects)
          const shardCount = dim > 90 ? 8 : 4;
          for (let i = 0; i < shardCount; i += 1) {
            const shardColor = i % 2 === 0 ? colors.accent : colors.secondary;
            const angle = (Math.PI * 2 * i) / shardCount + PhaserRuntime.Math.FloatBetween(-0.2, 0.2);
            const dist = radius * PhaserRuntime.Math.FloatBetween(1.05, 1.25);
            const shard = this.add.rectangle(
              center + Math.cos(angle) * dist,
              center + Math.sin(angle) * dist,
              PhaserRuntime.Math.Between(1, 2),
              PhaserRuntime.Math.Between(3, 6),
              shardColor,
              PhaserRuntime.Math.FloatBetween(0.25, 0.6)
            ).setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.shards.push(shard);

            this.tweens.add({
              targets: shard,
              y: shard.y - PhaserRuntime.Math.Between(6, 16),
              alpha: { from: shard.alpha, to: 0.05 },
              duration: PhaserRuntime.Math.Between(2200, 4200),
              repeat: -1,
              yoyo: true,
              ease: "Sine.inOut",
            });
          }

          // 7. Orbiting Photon Sparks (3 Sparks with ADD Blend)
          for (let i = 0; i < 3; i += 1) {
            const sparkColor = i === 1 ? colors.accent : colors.primary;
            const spark = this.add.circle(center + radius, center, 2.2, sparkColor, 0.95)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.particles.push(spark);

            const pathObj = { angle: (i * Math.PI * 2) / 3 };
            this.tweens.add({
              targets: pathObj,
              angle: pathObj.angle + Math.PI * 2,
              duration: 3200 + i * 500,
              repeat: -1,
              ease: "Linear",
              onUpdate: () => {
                spark.setPosition(
                  center + Math.cos(pathObj.angle) * radius,
                  center + Math.sin(pathObj.angle) * radius
                );
              },
            });
          }

          // 8. Micro Electric Flash Discharges (Periodic lightning arcs)
          this.dischargeTimer = this.time.addEvent({
            delay: 2800,
            loop: true,
            callback: () => {
              if (this.circuitPaths.length === 0) return;
              const path = PhaserRuntime.Utils.Array.GetRandom(this.circuitPaths);
              let step = 0;
              this.time.addEvent({
                delay: 45,
                repeat: 3,
                callback: () => {
                  this.lightningLayer.clear();
                  step += 1;
                  if (step % 2 === 0) return;

                  this.lightningLayer.lineStyle(1.5, colors.electric, 0.8);
                  this.lightningLayer.beginPath();
                  const sampleCount = 6;
                  for (let s = 0; s < sampleCount; s += 1) {
                    const p = path.getPoint(s / (sampleCount - 1));
                    if (!p) continue;
                    const jx = s === 0 || s === sampleCount - 1 ? 0 : PhaserRuntime.Math.Between(-2, 2);
                    const jy = s === 0 || s === sampleCount - 1 ? 0 : PhaserRuntime.Math.Between(-2, 2);
                    if (s === 0) this.lightningLayer.moveTo(p.x, p.y);
                    else this.lightningLayer.lineTo(p.x + jx, p.y + jy);
                  }
                  this.lightningLayer.strokePath();

                  if (step >= 4) {
                    this.time.delayedCall(60, () => this.lightningLayer.clear());
                  }
                },
              });
            },
          });
        }

        shutdown() {
          this.dischargeTimer?.destroy();
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: canvasRef.current,
        width: dim,
        height: dim,
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scene: FullAvatarPhaserScene,
        render: { antialias: true },
        audio: { noAudio: true },
      });
    }).catch(() => undefined);
  }, 40);

    return () => {
      disposed = true;
      clearTimeout(timerId);
      game?.destroy(true);
    };
  }, [showHalo, size, theme]);

  return (
    <div className={`match-avatar-frame-wrap size-${size} theme-${theme} ${className}`}>
      {showHalo ? <div className="match-avatar-canvas" ref={canvasRef} aria-hidden="true" /> : null}
      <div className="match-avatar-core">
        <div className="match-avatar-ring-outer" />
        <div className="match-avatar-ring-inner" />
        <div className="match-avatar-media">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={name}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span className="match-avatar-initial">{initial}</span>
        </div>
      </div>
    </div>
  );
});
