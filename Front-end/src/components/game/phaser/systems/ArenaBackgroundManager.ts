import Phaser from "phaser";
import type { GameState } from "@backend/game/types";

/* ─────────────────────────────────────────────────────────
 * ArenaBackgroundManager - Mythical Constellation Engine
 * ─────────────────────────────────────────────────────────
 * Automatically draws a random mythical creature constellation
 * (Dragon, Phoenix, Wolf, Leviathan, Stag) every 5 seconds.
 *
 * Cycle Breakdown (5.0s total):
 *   0.0s – 2.6s : Glowing tracer particle beam draws the creature paths.
 *   2.6s – 4.0s : Full constellation glows bright with pulsing star nodes.
 *   4.0s – 5.0s : Dissolves & fades out gracefully as next creature emerges.
 * ───────────────────────────────────────────────────────── */

interface Point2D {
  x: number; // 0.0 to 1.0
  y: number; // 0.0 to 1.0
}

interface Path2D {
  points: Point2D[];
}

interface CreatureConstellation {
  name: string;
  paths: Path2D[];
}

// ── 5 Mythical Creature Definitions (Normalized Coordinates) ─────────
const CREATURES: CreatureConstellation[] = [
  {
    name: "Dragon",
    paths: [
      { points: [{ x: 0.18, y: 0.72 }, { x: 0.32, y: 0.48 }, { x: 0.48, y: 0.56 }, { x: 0.64, y: 0.42 }, { x: 0.74, y: 0.32 }, { x: 0.82, y: 0.28 }] },
      { points: [{ x: 0.74, y: 0.32 }, { x: 0.78, y: 0.38 }, { x: 0.7, y: 0.4 }] },
      { points: [{ x: 0.74, y: 0.32 }, { x: 0.7, y: 0.2 }] },
      { points: [{ x: 0.48, y: 0.56 }, { x: 0.34, y: 0.28 }, { x: 0.22, y: 0.18 }, { x: 0.38, y: 0.38 }, { x: 0.48, y: 0.56 }] },
      { points: [{ x: 0.48, y: 0.56 }, { x: 0.62, y: 0.28 }, { x: 0.76, y: 0.18 }, { x: 0.6, y: 0.38 }, { x: 0.48, y: 0.56 }] },
      { points: [{ x: 0.18, y: 0.72 }, { x: 0.1, y: 0.66 }] },
      { points: [{ x: 0.18, y: 0.72 }, { x: 0.12, y: 0.78 }] },
    ],
  },
  {
    name: "Phoenix",
    paths: [
      { points: [{ x: 0.5, y: 0.78 }, { x: 0.5, y: 0.52 }, { x: 0.5, y: 0.36 }, { x: 0.5, y: 0.24 }] },
      { points: [{ x: 0.5, y: 0.24 }, { x: 0.46, y: 0.27 }] },
      { points: [{ x: 0.5, y: 0.24 }, { x: 0.5, y: 0.15 }, { x: 0.45, y: 0.18 }] },
      { points: [{ x: 0.5, y: 0.15 }, { x: 0.55, y: 0.18 }] },
      { points: [{ x: 0.5, y: 0.52 }, { x: 0.34, y: 0.38 }, { x: 0.16, y: 0.24 }, { x: 0.24, y: 0.44 }, { x: 0.32, y: 0.56 }, { x: 0.5, y: 0.52 }] },
      { points: [{ x: 0.5, y: 0.52 }, { x: 0.66, y: 0.38 }, { x: 0.84, y: 0.24 }, { x: 0.76, y: 0.44 }, { x: 0.68, y: 0.56 }, { x: 0.5, y: 0.52 }] },
      { points: [{ x: 0.5, y: 0.78 }, { x: 0.36, y: 0.9 }] },
      { points: [{ x: 0.5, y: 0.78 }, { x: 0.5, y: 0.94 }] },
      { points: [{ x: 0.5, y: 0.78 }, { x: 0.64, y: 0.9 }] },
    ],
  },
  {
    name: "Wolf",
    paths: [
      { points: [{ x: 0.78, y: 0.34 }, { x: 0.68, y: 0.26 }, { x: 0.64, y: 0.2 }] },
      { points: [{ x: 0.68, y: 0.26 }, { x: 0.74, y: 0.22 }] },
      { points: [{ x: 0.68, y: 0.26 }, { x: 0.6, y: 0.34 }, { x: 0.5, y: 0.4 }, { x: 0.36, y: 0.44 }, { x: 0.24, y: 0.48 }] },
      { points: [{ x: 0.6, y: 0.34 }, { x: 0.54, y: 0.54 }, { x: 0.5, y: 0.76 }] },
      { points: [{ x: 0.24, y: 0.48 }, { x: 0.26, y: 0.76 }] },
      { points: [{ x: 0.24, y: 0.48 }, { x: 0.12, y: 0.38 }] },
    ],
  },
  {
    name: "Leviathan",
    paths: [
      { points: [{ x: 0.84, y: 0.72 }, { x: 0.68, y: 0.8 }, { x: 0.48, y: 0.64 }, { x: 0.32, y: 0.42 }, { x: 0.42, y: 0.26 }, { x: 0.26, y: 0.32 }] },
      { points: [{ x: 0.26, y: 0.32 }, { x: 0.18, y: 0.34 }, { x: 0.22, y: 0.42 }] },
      { points: [{ x: 0.26, y: 0.32 }, { x: 0.28, y: 0.2 }] },
      { points: [{ x: 0.48, y: 0.64 }, { x: 0.54, y: 0.55 }] },
      { points: [{ x: 0.32, y: 0.42 }, { x: 0.24, y: 0.48 }] },
    ],
  },
  {
    name: "Stag",
    paths: [
      { points: [{ x: 0.58, y: 0.38 }, { x: 0.5, y: 0.32 }, { x: 0.5, y: 0.48 }, { x: 0.5, y: 0.6 }, { x: 0.38, y: 0.62 }, { x: 0.28, y: 0.64 }] },
      { points: [{ x: 0.5, y: 0.32 }, { x: 0.42, y: 0.22 }, { x: 0.36, y: 0.16 }] },
      { points: [{ x: 0.42, y: 0.22 }, { x: 0.46, y: 0.15 }] },
      { points: [{ x: 0.5, y: 0.32 }, { x: 0.58, y: 0.22 }, { x: 0.64, y: 0.16 }] },
      { points: [{ x: 0.58, y: 0.22 }, { x: 0.54, y: 0.15 }] },
      { points: [{ x: 0.5, y: 0.6 }, { x: 0.5, y: 0.8 }] },
      { points: [{ x: 0.28, y: 0.64 }, { x: 0.28, y: 0.8 }] },
    ],
  },
];

const CYCLE_DURATION = 5.0;
const DRAW_DURATION = 2.6;
const GLOW_DURATION = 1.4;
const DISSOLVE_DURATION = 1.0;

const FOG_COUNT = 6;
const SPORE_COUNT = 32;
const EMBER_COUNT = 14;

interface FogWisp {
  sprite: Phaser.GameObjects.Graphics;
  baseX: number;
  baseY: number;
  vx: number;
  width: number;
  height: number;
  phase: number;
}

interface Spore {
  sprite: Phaser.GameObjects.Ellipse;
  baseX: number;
  vy: number;
  drift: number;
  phase: number;
}

interface Ember {
  sprite: Phaser.GameObjects.Ellipse;
  baseX: number;
  baseY: number;
  life: number;
  maxLife: number;
}

export class ArenaBackgroundManager {
  private readonly scene: Phaser.Scene;

  private baseGfx?: Phaser.GameObjects.Graphics;
  private glowGfx?: Phaser.GameObjects.Graphics;
  private coreGfx?: Phaser.GameObjects.Graphics;
  private sparkGfx?: Phaser.GameObjects.Graphics;
  private readonly fogWisps: FogWisp[] = [];
  private readonly spores: Spore[] = [];
  private readonly embers: Ember[] = [];

  private currentCreatureIdx = 0;
  private cycleTimer = 0;
  private elapsed = 0;
  private currentPhase: GameState["phase"] = "ACTION";

  private pointerX = 0.5;
  private pointerY = 0.5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  init(width: number, height: number) {
    this.createBaseBackdrop(width, height);
    this.createConstellationGraphics();
    this.createFogWisps(width, height);
    this.createSpores(width, height);
    this.createEmbers(width, height);
    this.setupPointerTracking();
  }

  tick(delta: number, width: number, height: number, phase: GameState["phase"]) {
    const dt = delta * 0.001;
    this.elapsed += dt;
    this.cycleTimer += dt;

    if (this.cycleTimer >= CYCLE_DURATION) {
      this.cycleTimer %= CYCLE_DURATION;
      this.currentCreatureIdx = (this.currentCreatureIdx + 1) % CREATURES.length;
    }

    this.currentPhase = phase;
    this.drawConstellation(width, height);
    this.tickFog(delta, width, height);
    this.tickSpores(delta, width, height);
    this.tickEmbers(delta, width, height);
  }

  destroy() {
    this.baseGfx?.destroy();
    this.glowGfx?.destroy();
    this.coreGfx?.destroy();
    this.sparkGfx?.destroy();
    this.fogWisps.forEach((f) => f.sprite.destroy());
    this.spores.forEach((s) => s.sprite.destroy());
    this.embers.forEach((e) => e.sprite.destroy());
    this.fogWisps.length = 0;
    this.spores.length = 0;
    this.embers.length = 0;
  }

  private createBaseBackdrop(width: number, height: number) {
    this.baseGfx = this.scene.add.graphics().setDepth(0.01);
    this.baseGfx.fillStyle(0x02040a, 1).fillRect(0, 0, width, height);
  }

  private createConstellationGraphics() {
    this.glowGfx = this.scene.add.graphics().setDepth(0.1).setBlendMode(Phaser.BlendModes.ADD);
    this.coreGfx = this.scene.add.graphics().setDepth(0.2).setBlendMode(Phaser.BlendModes.ADD);
    this.sparkGfx = this.scene.add.graphics().setDepth(0.85).setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawConstellation(width: number, height: number) {
    if (!this.glowGfx || !this.coreGfx || !this.sparkGfx) return;
    this.glowGfx.clear();
    this.coreGfx.clear();
    this.sparkGfx.clear();

    const creature = CREATURES[this.currentCreatureIdx];
    if (!creature) return;

    let alpha = 1.0;
    let drawRatio = 1.0;

    if (this.cycleTimer < DRAW_DURATION) {
      drawRatio = this.cycleTimer / DRAW_DURATION;
      alpha = Math.min(1.0, this.cycleTimer * 2.5);
    } else if (this.cycleTimer < DRAW_DURATION + GLOW_DURATION) {
      drawRatio = 1.0;
      alpha = 1.0;
    } else {
      drawRatio = 1.0;
      const dissolveT = (this.cycleTimer - (DRAW_DURATION + GLOW_DURATION)) / DISSOLVE_DURATION;
      alpha = Math.max(0, 1.0 - dissolveT);
    }

    if (alpha <= 0.001) return;

    const isDanger = this.currentPhase === "COMBAT" || this.currentPhase === "BLOCK";
    const glowColor = isDanger ? 0xef4444 : 0x2dd4bf;
    const coreColor = isDanger ? 0xfb7185 : 0xa855f7;
    const sparkColor = isDanger ? 0xfbbf24 : 0x67e8f9;

    const px = (this.pointerX - 0.5) * width * 0.025;
    const py = (this.pointerY - 0.5) * height * 0.015;

    const breath = 1.0 + 0.04 * Math.sin(this.elapsed * 2.5);

    const allPaths = creature.paths;
    let totalLength = 0;
    const pathLengths: number[] = [];

    allPaths.forEach((path) => {
      let pathLen = 0;
      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];
        const dx = (p2.x - p1.x) * width;
        const dy = (p2.y - p1.y) * height;
        pathLen += Math.sqrt(dx * dx + dy * dy);
      }
      pathLengths.push(pathLen);
      totalLength += pathLen;
    });

    const currentTargetLen = totalLength * drawRatio;
    let accumulatedLen = 0;

    allPaths.forEach((path, pathIdx) => {
      const pathLen = pathLengths[pathIdx];
      if (accumulatedLen >= currentTargetLen) return;

      const pathProgress = Math.min(1.0, (currentTargetLen - accumulatedLen) / (pathLen || 1));
      accumulatedLen += pathLen;

      let remainingPathDraw = pathLen * pathProgress;

      this.glowGfx!.lineStyle(11, glowColor, alpha * 0.35 * breath);
      this.coreGfx!.lineStyle(2.6, coreColor, alpha * 0.85 * breath);

      this.glowGfx!.beginPath();
      this.coreGfx!.beginPath();

      let headX = 0;
      let headY = 0;
      let hasHead = false;

      for (let i = 0; i < path.points.length - 1; i++) {
        const p1 = path.points[i];
        const p2 = path.points[i + 1];

        const x1 = p1.x * width + px;
        const y1 = p1.y * height + py;
        const x2 = p2.x * width + px;
        const y2 = p2.y * height + py;

        const segDx = x2 - x1;
        const segDy = y2 - y1;
        const segLen = Math.sqrt(segDx * segDx + segDy * segDy);

        if (i === 0) {
          this.glowGfx!.moveTo(x1, y1);
          this.coreGfx!.moveTo(x1, y1);
          this.drawStarNode(x1, y1, alpha * breath, glowColor, sparkColor);
        }

        if (remainingPathDraw >= segLen) {
          this.glowGfx!.lineTo(x2, y2);
          this.coreGfx!.lineTo(x2, y2);
          this.drawStarNode(x2, y2, alpha * breath, glowColor, sparkColor);
          remainingPathDraw -= segLen;
          headX = x2;
          headY = y2;
          hasHead = true;
        } else {
          const segRatio = remainingPathDraw / segLen;
          const currX = x1 + segDx * segRatio;
          const currY = y1 + segDy * segRatio;
          this.glowGfx!.lineTo(currX, currY);
          this.coreGfx!.lineTo(currX, currY);
          headX = currX;
          headY = currY;
          hasHead = true;
          break;
        }
      }

      this.glowGfx!.strokePath();
      this.coreGfx!.strokePath();

      if (hasHead && drawRatio < 1.0) {
        this.sparkGfx!.fillStyle(sparkColor, alpha * 0.95);
        this.sparkGfx!.fillCircle(headX, headY, 5.5);
        this.sparkGfx!.lineStyle(2, 0xffffff, alpha * 0.9);
        this.sparkGfx!.strokeCircle(headX, headY, 9);
      }
    });
  }

  private drawStarNode(x: number, y: number, alpha: number, glowColor: number, sparkColor: number) {
    if (!this.sparkGfx) return;
    this.sparkGfx.fillStyle(sparkColor, alpha * 0.85);
    this.sparkGfx.fillCircle(x, y, 2.5);
    this.sparkGfx.lineStyle(1, glowColor, alpha * 0.5);
    this.sparkGfx.strokeCircle(x, y, 5.5);
  }

  private createFogWisps(width: number, height: number) {
    for (let i = 0; i < FOG_COUNT; i++) {
      const fogW = width * (0.35 + Math.random() * 0.5);
      const fogH = height * (0.08 + Math.random() * 0.08);
      const fog = this.scene.add.graphics().setDepth(0.3).setAlpha(0.08 + Math.random() * 0.06);
      fog.fillStyle(0x1a3a5c, 1);
      fog.fillEllipse(0, 0, fogW, fogH);

      const baseX = Math.random() * width;
      const baseY = height * (0.15 + Math.random() * 0.7);
      fog.setPosition(baseX, baseY);

      this.fogWisps.push({
        sprite: fog,
        baseX,
        baseY,
        vx: (Math.random() > 0.5 ? 1 : -1) * (6 + Math.random() * 12),
        width: fogW,
        height: fogH,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private tickFog(delta: number, width: number, _height: number) {
    const dt = delta * 0.001;
    const px = (this.pointerX - 0.5) * width * 0.02;

    for (const fog of this.fogWisps) {
      fog.baseX += fog.vx * dt;
      if (fog.baseX > width + fog.width) fog.baseX = -fog.width;
      if (fog.baseX < -fog.width) fog.baseX = width + fog.width;

      const breathAlpha = 0.05 + 0.03 * Math.sin(this.elapsed * 0.4 + fog.phase);
      fog.sprite.setPosition(fog.baseX + px, fog.baseY);
      fog.sprite.setAlpha(breathAlpha);
    }
  }

  private createSpores(width: number, height: number) {
    for (let i = 0; i < SPORE_COUNT; i++) {
      const size = 2 + Math.random() * 3.5;
      const color = Phaser.Display.Color.GetColor(34 + Math.floor(Math.random() * 30), 210 + Math.floor(Math.random() * 45), 180 + Math.floor(Math.random() * 60));
      const sprite = this.scene.add.ellipse(0, 0, size, size, color, 0.85)
        .setDepth(0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.3 + Math.random() * 0.4);

      this.spores.push({
        sprite,
        baseX: Math.random() * width,
        vy: -(12 + Math.random() * 20),
        drift: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
      });
      sprite.setPosition(this.spores[this.spores.length - 1].baseX, height + Math.random() * height);
    }
  }

  private tickSpores(delta: number, width: number, height: number) {
    const dt = delta * 0.001;
    const px = (this.pointerX - 0.5) * width * 0.04;
    const py = (this.pointerY - 0.5) * height * 0.02;

    for (const sp of this.spores) {
      let y = sp.sprite.y + sp.vy * dt;
      const xDrift = Math.sin(this.elapsed * 0.8 + sp.phase) * 18 * sp.drift;

      if (y < -10) {
        y = height + 10 + Math.random() * 40;
        sp.baseX = Math.random() * width;
        sp.phase = Math.random() * Math.PI * 2;
      }

      sp.sprite.setPosition(sp.baseX + xDrift + px, y + py);
      sp.sprite.setAlpha(0.2 + 0.25 * Math.sin(this.elapsed * 1.2 + sp.phase));
    }
  }

  private createEmbers(width: number, height: number) {
    for (let i = 0; i < EMBER_COUNT; i++) {
      const size = 2.5 + Math.random() * 3;
      const color = Phaser.Display.Color.GetColor(245 + Math.floor(Math.random() * 10), 110 + Math.floor(Math.random() * 60), 30 + Math.floor(Math.random() * 30));
      const sprite = this.scene.add.ellipse(0, 0, size, size, color, 0.95)
        .setDepth(0.8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0);

      const maxLife = 2.5 + Math.random() * 3;
      this.embers.push({
        sprite,
        baseX: width * (0.15 + Math.random() * 0.7),
        baseY: height * (0.75 + Math.random() * 0.2),
        life: Math.random() * maxLife,
        maxLife,
      });
    }
  }

  private tickEmbers(delta: number, width: number, height: number) {
    const dt = delta * 0.001;
    const px = (this.pointerX - 0.5) * width * 0.03;

    for (const em of this.embers) {
      em.life += dt;
      if (em.life >= em.maxLife) {
        em.life = 0;
        em.baseX = width * (0.15 + Math.random() * 0.7);
        em.baseY = height * (0.75 + Math.random() * 0.2);
        em.maxLife = 2.5 + Math.random() * 3;
      }

      const progress = em.life / em.maxLife;
      const fadeIn = Math.min(progress * 4, 1);
      const fadeOut = Math.max(1 - (progress - 0.6) * 2.5, 0);
      const alpha = fadeIn * fadeOut * 0.75;

      const riseY = em.baseY - progress * height * 0.35;
      const wobbleX = Math.sin(em.life * 2.5) * 8;

      em.sprite.setPosition(em.baseX + wobbleX + px, riseY);
      em.sprite.setAlpha(alpha);
    }
  }

  /* ── Pointer Tracking ───────────────────────────────── */

  private setupPointerTracking() {
    this.scene.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      this.pointerX = pointer.x / this.scene.scale.width;
      this.pointerY = pointer.y / this.scene.scale.height;
    });
  }
}
