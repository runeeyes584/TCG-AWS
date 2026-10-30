"use client";

import { useEffect, useRef, type RefObject } from "react";
import type Phaser from "phaser";

interface PhaserSearchingVortexProps {
  /** The radar the vortex circles. Its centre is the centre of every ring and of the spiral; its radius is where they start. */
  anchorRef?: RefObject<HTMLElement | null>;
}

/** The radius of the radar when there is no anchor to measure (px). */
const DEFAULT_RADAR_RADIUS = 110;
/** Rings stand at these multiples of the radar's radius: evenly spaced and wide apart, the first well clear of the radar's own rings. */
const RING_STEPS = [1.7, 2.5, 3.3, 4.1];
/** Every ring turns at this speed (degrees per second, one turn in 12 s like the rings of the radar), neighbours in opposite directions, and breathes in the same beat. */
const RING_SPIN = 30;
const RING_BREATH_MS = 3200;
const RING_BREATH = 0.025;
/** The lightning: bolts in a wave, how long a pulse (a bolt between two rings) lives, how often its jags change, and the delay between pulses. */
const LIGHTNING_BOLTS = 10;
const LIGHTNING_PULSE_MS = 300;
const LIGHTNING_FLICKER_MS = 55;
const LIGHTNING_STEP_MS = 140;
const LIGHTNING_EVERY_MS = 2600;

/** The points of one bolt or of one of its forks. */
type Bolt = Array<{ x: number; y: number }>;

interface Pulse {
  born: number;
  from: number;
  to: number;
  angles: number[];
  frame: number;
  paths: Bolt[][];
  /** Which ring this pulse reaches (0 = the first), for its colour. */
  reached: number;
}

/** Strokes a path of points with the line style the layer has now. */
function polyline(layer: Phaser.GameObjects.Graphics, path: Array<{ x: number; y: number }>) {
  layer.beginPath();
  path.forEach((point, i) => (i === 0 ? layer.moveTo(point.x, point.y) : layer.lineTo(point.x, point.y)));
  layer.strokePath();
}

/** One dash is about this long along the ring (px). */
const RING_DASH = 26;

export function PhaserSearchingVortex({ anchorRef }: PhaserSearchingVortexProps = {}) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then((mod) => {
      const PhaserRuntime = (mod as any).default || mod;
      if (disposed || !hostRef.current) return;

      /** The radar's centre and radius in the canvas' own px, measured from the DOM; the middle of the canvas without an anchor. */
      const measureRadar = () => {
        const host = hostRef.current;
        if (!host) return undefined;
        const hostBox = host.getBoundingClientRect();
        const anchor = anchorRef?.current;
        if (!anchor) return { cx: hostBox.width / 2, cy: hostBox.height / 2, radius: DEFAULT_RADAR_RADIUS };
        const box = anchor.getBoundingClientRect();
        // The radar scales in when it appears: its layout size is the real one, and the scale never moves its centre.
        return {
          cx: box.left + box.width / 2 - hostBox.left,
          cy: box.top + box.height / 2 - hostBox.top,
          radius: anchor.offsetWidth / 2,
        };
      };

      class SearchingVortexScene extends PhaserRuntime.Scene {
        private staticLayer!: Phaser.GameObjects.Graphics;
        private energyLayer!: Phaser.GameObjects.Graphics;
        private vortexParticles: Phaser.GameObjects.Arc[] = [];
        private scannerRings: Phaser.GameObjects.Graphics[] = [];
        private coreGlow?: Phaser.GameObjects.Arc;
        private lightningTimer?: Phaser.Time.TimerEvent;
        /** Where the vortex is centred now; the particles read it every frame, so they follow the radar. */
        private radar = { cx: 0, cy: 0, radius: DEFAULT_RADAR_RADIUS };
        private ringClock = 0;
        private ringRadii: number[] = [];
        private pulses: Pulse[] = [];
        private lightningDrawn = false;
        /** Less motion asked for: the rings still turn, but there is no lightning. */
        private calm = typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

        constructor() {
          super("searching-vortex-scene");
        }

        create() {
          this.staticLayer = this.add.graphics();
          this.energyLayer = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.syncRadar();
          this.rebuildVortex();
          this.scale.on("resize", this.rebuildVortex, this);

          this.lightningTimer = this.time.addEvent({
            delay: LIGHTNING_EVERY_MS,
            loop: true,
            startAt: LIGHTNING_EVERY_MS - 600,
            callback: this.startLightningWave,
            callbackScope: this,
          });
        }

        /** Re-reads where the radar is. "moved": the same radar somewhere else; "resized": its radius changed, so the rings are rebuilt. */
        private syncRadar(): "none" | "moved" | "resized" {
          const next = measureRadar();
          if (!next) return "none";
          const resized = Math.abs(next.radius - this.radar.radius) > 1;
          const moved = Math.abs(next.cx - this.radar.cx) > 0.5 || Math.abs(next.cy - this.radar.cy) > 0.5;
          if (resized || moved) this.radar = next;
          return resized ? "resized" : moved ? "moved" : "none";
        }

        update(_time: number, delta: number) {
          const change = this.syncRadar();
          if (change === "resized") this.rebuildVortex();
          const { cx, cy } = this.radar;
          if (change === "moved") this.coreGlow?.setPosition(cx, cy);

          // Every ring turns at the same speed, neighbours the other way, and all breathe on one beat.
          this.ringClock += delta;
          const breath = 1 + RING_BREATH * Math.sin((this.ringClock / RING_BREATH_MS) * Math.PI * 2);
          this.drawLightning();
          this.scannerRings.forEach((ring, idx) => {
            ring.setPosition(cx, cy);
            ring.angle += (idx % 2 === 0 ? -1 : 1) * RING_SPIN * (delta / 1000);
            ring.setScale(breath);
          });
        }

        private rebuildVortex() {
          this.vortexParticles.forEach((p) => {
            this.tweens.killTweensOf(p);
            p.destroy();
          });
          this.scannerRings.forEach((r) => r.destroy());
          if (this.coreGlow) this.tweens.killTweensOf(this.coreGlow);
          this.coreGlow?.destroy();
          this.coreGlow = undefined;
          this.vortexParticles = [];
          this.scannerRings = [];
          this.staticLayer.clear();
          this.energyLayer.clear();

          const { width, height } = this.scale;
          if (width <= 0 || height <= 0) return;
          this.syncRadar();

          const { cx, cy, radius } = this.radar;
          // The rings stand off the radar's own rings, evenly spaced, and shrink together if the screen has no room for them all.
          const room = Math.min(cx, width - cx, cy, height - cy) - 8;
          const fit = Math.min(1, room / (radius * RING_STEPS[RING_STEPS.length - 1]));
          const ringRadii = RING_STEPS.map((step) => radius * step * fit);
          this.ringRadii = ringRadii;
          this.pulses = [];
          const maxRadius = ringRadii[ringRadii.length - 1];

          // 1. Concentric rings: dashed, evenly spaced dashes, one weight each, alternating cyan and violet.
          ringRadii.forEach((ringRadius, idx) => {
            const color = idx % 2 === 0 ? 0x00f0ff : 0xa855f7;
            const dashes = Math.max(10, Math.round((Math.PI * ringRadius) / RING_DASH));
            const step = (Math.PI * 2) / dashes;
            const ring = this.add.graphics({ x: cx, y: cy }).setBlendMode(PhaserRuntime.BlendModes.ADD);
            ring.lineStyle(1.5, color, 0.45);
            for (let i = 0; i < dashes; i += 1) {
              ring.beginPath();
              ring.arc(0, 0, ringRadius, i * step, i * step + step * 0.55);
              ring.strokePath();
            }
            this.scannerRings.push(ring);
          });

          // 2. Swirling Vortex Singularity Particles (Abyssal Rift)
          const particleCount = 48;
          for (let i = 0; i < particleCount; i += 1) {
            const initialRadius = PhaserRuntime.Math.Between(maxRadius * 0.2, maxRadius * 1.1);
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

            // Inward spiral animation, around wherever the radar is now.
            this.tweens.add({
              targets: orbit,
              radius: { from: initialRadius, to: maxRadius * 0.1 },
              angle: initialAngle + Math.PI * 4,
              duration: PhaserRuntime.Math.Between(2800, 5600),
              repeat: -1,
              ease: "Cubic.in",
              onUpdate: () => {
                p.setPosition(
                  this.radar.cx + Math.cos(orbit.angle) * orbit.radius,
                  this.radar.cy + Math.sin(orbit.angle) * orbit.radius
                );
                p.setAlpha((orbit.radius / maxRadius) * 0.9);
              },
            });
          }

          // 3. Central singularity glow
          this.coreGlow = this.add.circle(cx, cy, radius * 0.5, 0x8d6bff, 0.12)
            .setBlendMode(PhaserRuntime.BlendModes.ADD);

          this.tweens.add({
            targets: this.coreGlow,
            scale: { from: 0.8, to: 1.4 },
            alpha: { from: 0.08, to: 0.25 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.inOut",
          });
        }

        /**
         * One wave of lightning: a ring of bolts that jumps outward through the rings one after the other, each pulse
         * running from one ring to the next and lighting the ring it reaches. Every bolt is a glow under a bright core, with a
         * fork or two, and is drawn again with new jags every few frames, so it flickers like the real thing.
         */
        private startLightningWave() {
          if (this.calm || this.ringRadii.length === 0) return;
          const bolts = LIGHTNING_BOLTS;
          const base = PhaserRuntime.Math.FloatBetween(0, Math.PI * 2);
          const angles = Array.from({ length: bolts }, (_, i) => base + (Math.PI * 2 * i) / bolts + PhaserRuntime.Math.FloatBetween(-0.12, 0.12));
          const edges = [this.radar.radius * 1.08, ...this.ringRadii];
          for (let k = 0; k < edges.length - 1; k += 1) {
            this.time.delayedCall(k * LIGHTNING_STEP_MS, () => {
              this.pulses.push({ born: this.time.now, from: edges[k], to: edges[k + 1], angles, frame: -1, paths: [], reached: k });
            });
          }
        }

        /** The jagged path of one bolt from radius `from` to `to` at `angle`, and the forks that leave it. */
        private boltPaths(angle: number, from: number, to: number) {
          const { cx, cy } = this.radar;
          const along = (r: number, offset: number, a: number) => ({
            x: cx + Math.cos(a) * r - Math.sin(a) * offset,
            y: cy + Math.sin(a) * r + Math.cos(a) * offset,
          });
          const length = to - from;
          const segments = Math.max(5, Math.round(length / 22));
          const jag = Math.max(5, length * 0.14);
          const main: Bolt = [along(from, 0, angle)];
          for (let i = 1; i < segments; i += 1) {
            main.push(along(from + (length * i) / segments, PhaserRuntime.Math.FloatBetween(-jag, jag), angle));
          }
          main.push(along(to, 0, angle));

          const paths = [main];
          // One fork almost always, a second one often: they leave the bolt on opposite sides.
          const forks = Math.random() < 0.45 ? 2 : 1;
          const firstSide = Math.random() < 0.5 ? -1 : 1;
          for (let f = 0; f < forks; f += 1) {
            const at = PhaserRuntime.Math.Between(1, segments - 2);
            const side = f === 0 ? firstSide : -firstSide;
            const forkAngle = angle + side * PhaserRuntime.Math.FloatBetween(0.2, 0.4);
            const forkLength = length * PhaserRuntime.Math.FloatBetween(0.4, 0.7);
            const start = main[at];
            const fork: Bolt = [start];
            for (let i = 1; i <= 3; i += 1) {
              const r = (forkLength * i) / 3;
              fork.push({
                x: start.x + Math.cos(forkAngle) * r + PhaserRuntime.Math.FloatBetween(-jag, jag) * 0.5,
                y: start.y + Math.sin(forkAngle) * r + PhaserRuntime.Math.FloatBetween(-jag, jag) * 0.5,
              });
            }
            paths.push(fork);
          }
          return paths;
        }

        /** Draws every pulse that is alive: the ring it has reached flashes, then the bolts, glow first and the core on top. */
        private drawLightning() {
          const layer = this.energyLayer;
          if (this.pulses.length === 0) {
            if (this.lightningDrawn) {
              layer.clear();
              this.lightningDrawn = false;
            }
            return;
          }
          layer.clear();
          this.lightningDrawn = true;
          const now = this.time.now;
          this.pulses = this.pulses.filter((pulse) => now - pulse.born < LIGHTNING_PULSE_MS);
          for (const pulse of this.pulses) {
            const age = now - pulse.born;
            const fade = 1 - age / LIGHTNING_PULSE_MS;
            const frame = Math.floor(age / LIGHTNING_FLICKER_MS);
            if (frame !== pulse.frame) {
              pulse.frame = frame;
              pulse.paths = pulse.angles.map((angle) => this.boltPaths(angle, pulse.from, pulse.to));
            }

            // The ring the pulse has reached lights up, and a faint ring of light stands where it left.
            const ringColor = pulse.reached % 2 === 0 ? 0x00f0ff : 0xa855f7;
            layer.lineStyle(7, ringColor, 0.18 * fade);
            layer.strokeCircle(this.radar.cx, this.radar.cy, pulse.to);
            layer.lineStyle(2.4, ringColor, 0.8 * fade);
            layer.strokeCircle(this.radar.cx, this.radar.cy, pulse.to);

            pulse.paths.forEach((paths, index) => {
              const glow = index % 2 === 0 ? 0x00f0ff : 0xa855f7;
              for (const path of paths) {
                layer.lineStyle(10, glow, 0.2 * fade);
                polyline(layer, path);
                layer.lineStyle(4, glow, 0.6 * fade);
                polyline(layer, path);
                layer.lineStyle(1.6, 0xeafcff, fade);
                polyline(layer, path);
              }
            });
          }
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
