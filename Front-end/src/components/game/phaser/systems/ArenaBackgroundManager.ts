import Phaser from "phaser";
import type { GameState } from "@backend/game/types";

/* ─────────────────────────────────────────────────────────
 * ArenaBackgroundManager - Mythical Constellation Engine
 * ─────────────────────────────────────────────────────────
 * Features:
 *   1. 5 Detailed Anatomical Constellation Beasts (Dragon, Phoenix, Wolf, Leviathan, Stag)
 *   2. Softened Spark Tracer & Refined Thin Lines
 *   3. Dark Blue Electric Circuit Network & Lightning Discharge Flashes
 *   4. 4-Corner Animated Beast Eyes (Rotation, Open 3s, Look Around, Close 3s)
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

// ── 5 Detailed Anatomical Creature Definitions ─────────────────────────
const CREATURES: CreatureConstellation[] = [
  // 1. Celestial Dragon (Rồng Thần)
  {
    name: "Dragon",
    paths: [
      // Spine & Crest
      { points: [{ x: 0.15, y: 0.76 }, { x: 0.24, y: 0.62 }, { x: 0.36, y: 0.46 }, { x: 0.48, y: 0.54 }, { x: 0.62, y: 0.44 }, { x: 0.72, y: 0.32 }, { x: 0.82, y: 0.28 }] },
      // Snout, Jaw & Fangs
      { points: [{ x: 0.82, y: 0.28 }, { x: 0.88, y: 0.29 }, { x: 0.84, y: 0.35 }, { x: 0.74, y: 0.36 }, { x: 0.72, y: 0.32 }] },
      { points: [{ x: 0.84, y: 0.35 }, { x: 0.82, y: 0.41 }] },
      // Horns
      { points: [{ x: 0.76, y: 0.3 }, { x: 0.78, y: 0.18 }, { x: 0.71, y: 0.14 }] },
      { points: [{ x: 0.74, y: 0.32 }, { x: 0.68, y: 0.22 }] },
      // Left Wing Ribs & Claws
      { points: [{ x: 0.48, y: 0.54 }, { x: 0.36, y: 0.26 }, { x: 0.22, y: 0.16 }, { x: 0.32, y: 0.36 }, { x: 0.4, y: 0.48 }, { x: 0.48, y: 0.54 }] },
      { points: [{ x: 0.36, y: 0.26 }, { x: 0.26, y: 0.34 }] },
      { points: [{ x: 0.36, y: 0.26 }, { x: 0.34, y: 0.44 }] },
      // Right Wing Ribs
      { points: [{ x: 0.48, y: 0.54 }, { x: 0.62, y: 0.26 }, { x: 0.78, y: 0.16 }, { x: 0.68, y: 0.36 }, { x: 0.58, y: 0.48 }, { x: 0.48, y: 0.54 }] },
      { points: [{ x: 0.62, y: 0.26 }, { x: 0.72, y: 0.34 }] },
      // Front Claws
      { points: [{ x: 0.62, y: 0.44 }, { x: 0.64, y: 0.54 }, { x: 0.68, y: 0.58 }] },
      // Tail Flame Plumes
      { points: [{ x: 0.15, y: 0.76 }, { x: 0.08, y: 0.7 }, { x: 0.04, y: 0.64 }] },
      { points: [{ x: 0.15, y: 0.76 }, { x: 0.09, y: 0.82 }, { x: 0.05, y: 0.88 }] },
    ],
  },
  // 2. Astral Phoenix (Phượng Hoàng Vũ Trụ)
  {
    name: "Phoenix",
    paths: [
      // Crown Feather Plumes & Head
      { points: [{ x: 0.5, y: 0.12 }, { x: 0.46, y: 0.17 }, { x: 0.5, y: 0.24 }] },
      { points: [{ x: 0.5, y: 0.12 }, { x: 0.54, y: 0.17 }, { x: 0.5, y: 0.24 }] },
      { points: [{ x: 0.5, y: 0.24 }, { x: 0.44, y: 0.26 }, { x: 0.5, y: 0.3 }] },
      // Neck, Sternum & Body Plumes
      { points: [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.44 }, { x: 0.47, y: 0.56 }, { x: 0.5, y: 0.72 }] },
      { points: [{ x: 0.5, y: 0.44 }, { x: 0.53, y: 0.56 }, { x: 0.5, y: 0.72 }] },
      // Left Wing Feathers
      { points: [{ x: 0.5, y: 0.44 }, { x: 0.34, y: 0.34 }, { x: 0.14, y: 0.2 }, { x: 0.2, y: 0.38 }, { x: 0.28, y: 0.5 }, { x: 0.38, y: 0.6 }, { x: 0.5, y: 0.72 }] },
      { points: [{ x: 0.34, y: 0.34 }, { x: 0.22, y: 0.48 }] },
      { points: [{ x: 0.2, y: 0.38 }, { x: 0.3, y: 0.56 }] },
      // Right Wing Feathers
      { points: [{ x: 0.5, y: 0.44 }, { x: 0.66, y: 0.34 }, { x: 0.86, y: 0.2 }, { x: 0.8, y: 0.38 }, { x: 0.72, y: 0.5 }, { x: 0.62, y: 0.6 }, { x: 0.5, y: 0.72 }] },
      { points: [{ x: 0.66, y: 0.34 }, { x: 0.78, y: 0.48 }] },
      // Triple Flowing Tail Plumes
      { points: [{ x: 0.5, y: 0.72 }, { x: 0.36, y: 0.84 }, { x: 0.28, y: 0.94 }] },
      { points: [{ x: 0.5, y: 0.72 }, { x: 0.5, y: 0.88 }, { x: 0.5, y: 0.96 }] },
      { points: [{ x: 0.5, y: 0.72 }, { x: 0.64, y: 0.84 }, { x: 0.72, y: 0.94 }] },
    ],
  },
  // 3. Spectral Wolf (Sói Thần)
  {
    name: "Wolf",
    paths: [
      // Ear L & Ear R
      { points: [{ x: 0.64, y: 0.16 }, { x: 0.68, y: 0.24 }, { x: 0.72, y: 0.28 }] },
      { points: [{ x: 0.74, y: 0.18 }, { x: 0.76, y: 0.26 }, { x: 0.72, y: 0.28 }] },
      // Snout Bridge, Nose & Jaw
      { points: [{ x: 0.72, y: 0.28 }, { x: 0.82, y: 0.34 }, { x: 0.78, y: 0.4 }, { x: 0.68, y: 0.38 }, { x: 0.62, y: 0.32 }] },
      // Throat & Chest
      { points: [{ x: 0.68, y: 0.38 }, { x: 0.6, y: 0.46 }, { x: 0.54, y: 0.58 }] },
      // Mane & Curved Spine & Rump
      { points: [{ x: 0.72, y: 0.28 }, { x: 0.6, y: 0.34 }, { x: 0.48, y: 0.38 }, { x: 0.36, y: 0.42 }, { x: 0.24, y: 0.46 }] },
      // Front Legs & Paws
      { points: [{ x: 0.54, y: 0.58 }, { x: 0.52, y: 0.7 }, { x: 0.5, y: 0.82 }] },
      { points: [{ x: 0.58, y: 0.56 }, { x: 0.57, y: 0.7 }, { x: 0.56, y: 0.82 }] },
      // Rear Legs
      { points: [{ x: 0.24, y: 0.46 }, { x: 0.22, y: 0.62 }, { x: 0.26, y: 0.74 }, { x: 0.24, y: 0.82 }] },
      // Bushy Tail
      { points: [{ x: 0.24, y: 0.46 }, { x: 0.14, y: 0.38 }, { x: 0.08, y: 0.44 }, { x: 0.18, y: 0.52 }] },
    ],
  },
  // 4. Abyssal Leviathan (Thủy Quái Vực Thẫm)
  {
    name: "Leviathan",
    paths: [
      // Serpentine Coiling Body
      { points: [{ x: 0.86, y: 0.76 }, { x: 0.72, y: 0.84 }, { x: 0.52, y: 0.68 }, { x: 0.34, y: 0.44 }, { x: 0.44, y: 0.24 }, { x: 0.28, y: 0.28 }, { x: 0.18, y: 0.36 }] },
      // Fanged Jaw & Head Crest
      { points: [{ x: 0.18, y: 0.36 }, { x: 0.12, y: 0.38 }, { x: 0.16, y: 0.44 }, { x: 0.24, y: 0.42 }] },
      { points: [{ x: 0.12, y: 0.38 }, { x: 0.14, y: 0.45 }] },
      { points: [{ x: 0.28, y: 0.28 }, { x: 0.32, y: 0.16 }, { x: 0.24, y: 0.18 }] },
      // Dorsal Fin Spikes
      { points: [{ x: 0.52, y: 0.68 }, { x: 0.58, y: 0.58 }] },
      { points: [{ x: 0.34, y: 0.44 }, { x: 0.26, y: 0.52 }] },
      { points: [{ x: 0.44, y: 0.24 }, { x: 0.52, y: 0.2 }] },
      // Fluke Tail
      { points: [{ x: 0.86, y: 0.76 }, { x: 0.94, y: 0.7 }, { x: 0.92, y: 0.82 }] },
    ],
  },
  // 5. Mystic Stag (Hươu Thần Rừng Thẫm)
  {
    name: "Stag",
    paths: [
      // Snout, Jaw, Head & Neck
      { points: [{ x: 0.62, y: 0.36 }, { x: 0.54, y: 0.3 }, { x: 0.48, y: 0.32 }, { x: 0.48, y: 0.46 }, { x: 0.5, y: 0.58 }] },
      // Left Multi-Tined Antler
      { points: [{ x: 0.48, y: 0.32 }, { x: 0.42, y: 0.2 }, { x: 0.36, y: 0.12 }] },
      { points: [{ x: 0.42, y: 0.2 }, { x: 0.46, y: 0.12 }] },
      { points: [{ x: 0.38, y: 0.15 }, { x: 0.32, y: 0.18 }] },
      // Right Multi-Tined Antler
      { points: [{ x: 0.48, y: 0.32 }, { x: 0.56, y: 0.2 }, { x: 0.62, y: 0.12 }] },
      { points: [{ x: 0.56, y: 0.2 }, { x: 0.52, y: 0.12 }] },
      { points: [{ x: 0.6, y: 0.15 }, { x: 0.66, y: 0.18 }] },
      // Ears
      { points: [{ x: 0.48, y: 0.32 }, { x: 0.4, y: 0.3 }] },
      { points: [{ x: 0.48, y: 0.32 }, { x: 0.56, y: 0.32 }] },
      // Body Spine & Rump
      { points: [{ x: 0.5, y: 0.58 }, { x: 0.38, y: 0.6 }, { x: 0.26, y: 0.62 }] },
      // Jointed Legs & Hooves
      { points: [{ x: 0.5, y: 0.58 }, { x: 0.5, y: 0.72 }, { x: 0.48, y: 0.82 }] },
      { points: [{ x: 0.26, y: 0.62 }, { x: 0.28, y: 0.72 }, { x: 0.26, y: 0.82 }] },
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

// ── Beast Eyes Configuration ───────────────────────────
interface BeastEye {
  xRatio: number;
  yRatio: number;
}

const BEAST_EYES: BeastEye[] = [
  { xRatio: 0.07, yRatio: 0.12 }, // Top-Left
  { xRatio: 0.93, yRatio: 0.12 }, // Top-Right
  { xRatio: 0.07, yRatio: 0.88 }, // Bottom-Left
  { xRatio: 0.93, yRatio: 0.88 }, // Bottom-Right
];

const EYE_CYCLE_DURATION = 6.5;
const EYE_OPEN_TIME = 0.5;
const EYE_ACTIVE_TIME = 3.0;
const EYE_CLOSE_TIME = 0.5;

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

  // Layers
  private baseGfx?: Phaser.GameObjects.Graphics;
  private electricGfx?: Phaser.GameObjects.Graphics;
  private glowGfx?: Phaser.GameObjects.Graphics;
  private coreGfx?: Phaser.GameObjects.Graphics;
  private sparkGfx?: Phaser.GameObjects.Graphics;
  private eyeGfx?: Phaser.GameObjects.Graphics;

  private readonly fogWisps: FogWisp[] = [];
  private readonly spores: Spore[] = [];
  private readonly embers: Ember[] = [];

  // Constellation State
  private currentCreatureIdx = 0;
  private cycleTimer = 0;
  private elapsed = 0;
  private currentPhase: GameState["phase"] = "ACTION";

  // Electric Circuit Discharge State
  private dischargeTimer = 0;
  private activeLightningPath: Point2D[] | null = null;
  private lightningAlpha = 0;

  // Beast Eyes Rotation State
  private activeEyeIdx = 0;
  private eyeTimer = 0;

  // Parallax Pointer Tracking
  private pointerX = 0.5;
  private pointerY = 0.5;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /* ── Public API ──────────────────────────────────────── */

  init(width: number, height: number) {
    this.createBaseBackdrop(width, height);
    this.createElectricGraphics();
    this.createConstellationGraphics();
    this.createFogWisps(width, height);
    this.createSpores(width, height);
    this.createEmbers(width, height);
    this.setupPointerTracking();
  }

  /**
   * Called every frame from scene update loop.
   * `delta` in ms.
   */
  tick(delta: number, width: number, height: number, phase: GameState["phase"]) {
    const dt = delta * 0.001;
    this.elapsed += dt;
    this.cycleTimer += dt;
    this.eyeTimer += dt;
    this.dischargeTimer += dt;

    // 5-second automatic creature rotation loop
    if (this.cycleTimer >= CYCLE_DURATION) {
      this.cycleTimer %= CYCLE_DURATION;
      this.currentCreatureIdx = (this.currentCreatureIdx + 1) % CREATURES.length;
    }

    // 6.5-second beast eye rotation loop
    if (this.eyeTimer >= EYE_CYCLE_DURATION) {
      this.eyeTimer %= EYE_CYCLE_DURATION;
      this.activeEyeIdx = (this.activeEyeIdx + 1) % BEAST_EYES.length;
    }

    // 1.3-second frequent electric discharge flash trigger
    if (this.dischargeTimer >= 1.3) {
      this.dischargeTimer = 0;
      this.triggerLightningFlash();
    }

    this.currentPhase = phase;

    this.drawElectricCircuits(width, height);
    this.drawConstellation(width, height);
    this.tickFog(delta, width, height);
    this.tickSpores(delta, width, height);
    this.tickEmbers(delta, width, height);
  }

  destroy() {
    this.baseGfx?.destroy();
    this.electricGfx?.destroy();
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

  /* ── Base Backdrop ──────────────────────────────────── */

  private createBaseBackdrop(width: number, height: number) {
    this.baseGfx = this.scene.add.graphics().setDepth(0.01);
    this.baseGfx.fillStyle(0x02040a, 1).fillRect(0, 0, width, height);
  }

  /* ── Dark Blue Electric Circuits & Lightning ─────────── */

  private createElectricGraphics() {
    this.electricGfx = this.scene.add.graphics().setDepth(0.05).setBlendMode(Phaser.BlendModes.ADD);
  }

  private triggerLightningFlash() {
    const samplePaths: Point2D[][] = [
      [{ x: 0.01, y: 0.1 }, { x: 0.18, y: 0.1 }, { x: 0.28, y: 0.2 }, { x: 0.42, y: 0.2 }],
      [{ x: 0.99, y: 0.12 }, { x: 0.82, y: 0.12 }, { x: 0.72, y: 0.22 }, { x: 0.58, y: 0.22 }],
      [{ x: 0.01, y: 0.88 }, { x: 0.16, y: 0.88 }, { x: 0.26, y: 0.78 }, { x: 0.45, y: 0.78 }],
      [{ x: 0.99, y: 0.88 }, { x: 0.82, y: 0.88 }, { x: 0.72, y: 0.78 }, { x: 0.55, y: 0.78 }],
      [{ x: 0.35, y: 0.01 }, { x: 0.35, y: 0.12 }, { x: 0.48, y: 0.22 }],
      [{ x: 0.65, y: 0.99 }, { x: 0.65, y: 0.88 }, { x: 0.52, y: 0.78 }],
    ];
    this.activeLightningPath = Phaser.Utils.Array.GetRandom(samplePaths);
    this.lightningAlpha = 0.95;
  }

  private drawElectricCircuits(width: number, height: number) {
    if (!this.electricGfx) return;
    this.electricGfx.clear();

    const circuitColor = 0x0369a1;
    const nodeColor = 0x0284c7;
    const flashColor = 0x38bdf8;

    const circuits: Point2D[][] = [
      [{ x: 0.01, y: 0.1 }, { x: 0.18, y: 0.1 }, { x: 0.28, y: 0.2 }, { x: 0.42, y: 0.2 }],
      [{ x: 0.01, y: 0.88 }, { x: 0.16, y: 0.88 }, { x: 0.26, y: 0.78 }, { x: 0.45, y: 0.78 }],
      [{ x: 0.99, y: 0.12 }, { x: 0.82, y: 0.12 }, { x: 0.72, y: 0.22 }, { x: 0.58, y: 0.22 }],
      [{ x: 0.99, y: 0.88 }, { x: 0.82, y: 0.88 }, { x: 0.72, y: 0.78 }, { x: 0.55, y: 0.78 }],
      [{ x: 0.35, y: 0.01 }, { x: 0.35, y: 0.12 }, { x: 0.48, y: 0.22 }],
      [{ x: 0.65, y: 0.99 }, { x: 0.65, y: 0.88 }, { x: 0.52, y: 0.78 }],
    ];

    const pulseProgress = (this.elapsed * 0.45) % 1;

    circuits.forEach((pts) => {
      this.electricGfx!.lineStyle(1.2, circuitColor, 0.22);
      this.electricGfx!.beginPath();
      this.electricGfx!.moveTo(pts[0].x * width, pts[0].y * height);

      for (let i = 1; i < pts.length; i++) {
        const x = pts[i].x * width;
        const y = pts[i].y * height;
        this.electricGfx!.lineTo(x, y);

        this.electricGfx!.fillStyle(nodeColor, 0.45);
        this.electricGfx!.fillCircle(x, y, i === pts.length - 1 ? 3.2 : 1.8);
      }
      this.electricGfx!.strokePath();

      const totalSegs = pts.length - 1;
      const targetSeg = Math.floor(pulseProgress * totalSegs);
      const segT = (pulseProgress * totalSegs) % 1;
      if (targetSeg < totalSegs) {
        const p1 = pts[targetSeg];
        const p2 = pts[targetSeg + 1];
        const sx = (p1.x + (p2.x - p1.x) * segT) * width;
        const sy = (p1.y + (p2.y - p1.y) * segT) * height;
        this.electricGfx!.fillStyle(flashColor, 0.85);
        this.electricGfx!.fillCircle(sx, sy, 2.2);
      }
    });

    if (this.activeLightningPath && this.lightningAlpha > 0.02) {
      this.lightningAlpha *= 0.82;
      this.electricGfx.lineStyle(2.2, flashColor, this.lightningAlpha * 0.85);
      this.electricGfx.beginPath();

      const pts = this.activeLightningPath;
      pts.forEach((p, idx) => {
        const jx = idx === 0 || idx === pts.length - 1 ? 0 : (Math.random() - 0.5) * 8;
        const jy = idx === 0 || idx === pts.length - 1 ? 0 : (Math.random() - 0.5) * 8;
        const x = p.x * width + jx;
        const y = p.y * height + jy;
        if (idx === 0) this.electricGfx!.moveTo(x, y);
        else this.electricGfx!.lineTo(x, y);
      });
      this.electricGfx.strokePath();
    }
  }

  /* ── Constellation Creature Engine ───────────────────── */

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

      this.glowGfx!.lineStyle(3, glowColor, alpha * 0.14 * breath);
      this.coreGfx!.lineStyle(0.9, coreColor, alpha * 0.40 * breath);

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
        this.sparkGfx!.fillStyle(sparkColor, alpha * 0.22);
        this.sparkGfx!.fillCircle(headX, headY, 2.0);
        this.sparkGfx!.lineStyle(0.8, 0xffffff, alpha * 0.2);
        this.sparkGfx!.strokeCircle(headX, headY, 3.8);
      }
    });
  }

  private drawStarNode(x: number, y: number, alpha: number, glowColor: number, sparkColor: number) {
    if (!this.sparkGfx) return;
    this.sparkGfx.fillStyle(sparkColor, alpha * 0.35);
    this.sparkGfx.fillCircle(x, y, 1.2);
    this.sparkGfx.lineStyle(0.6, glowColor, alpha * 0.2);
    this.sparkGfx.strokeCircle(x, y, 2.5);
  }

  /* ── 4-Corner Beast Eye Engine ────────────────────────── */

  private createEyeGraphics() {
    this.eyeGfx = this.scene.add.graphics().setDepth(0.6).setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawBeastEyes(width: number, height: number) {
    if (!this.eyeGfx) return;
    this.eyeGfx.clear();

    const activeEyeConfig = BEAST_EYES[this.activeEyeIdx];
    if (!activeEyeConfig) return;

    let openRatio = 0;
    let activeAlpha = 0;

    if (this.eyeTimer < EYE_OPEN_TIME) {
      openRatio = Math.sin((this.eyeTimer / EYE_OPEN_TIME) * (Math.PI / 2));
      activeAlpha = openRatio;
    } else if (this.eyeTimer < EYE_OPEN_TIME + EYE_ACTIVE_TIME) {
      openRatio = 1.0;
      activeAlpha = 1.0;
    } else if (this.eyeTimer < EYE_OPEN_TIME + EYE_ACTIVE_TIME + EYE_CLOSE_TIME) {
      const closeT = (this.eyeTimer - (EYE_OPEN_TIME + EYE_ACTIVE_TIME)) / EYE_CLOSE_TIME;
      openRatio = Math.cos(closeT * (Math.PI / 2));
      activeAlpha = openRatio;
    } else {
      return;
    }

    if (activeAlpha <= 0.01) return;

    const eyeX = activeEyeConfig.xRatio * width;
    const eyeY = activeEyeConfig.yRatio * height;

    const eyeW = 28;
    const eyeH = 14 * openRatio;

    const isDanger = this.currentPhase === "COMBAT" || this.currentPhase === "BLOCK";
    const irisColor = isDanger ? 0xef4444 : 0x8b5cf6;
    const pupilColor = isDanger ? 0xfbbf24 : 0x06b6d4;

    const pupilTrackX = (this.pointerX - 0.5) * 5;
    const pupilTrackY = (this.pointerY - 0.5) * 3;

    this.eyeGfx.fillStyle(irisColor, activeAlpha * 0.15);
    this.eyeGfx.fillEllipse(eyeX, eyeY, eyeW * 1.6, Math.max(2, eyeH * 1.6));

    this.eyeGfx.lineStyle(1.8, irisColor, activeAlpha * 0.7);
    this.eyeGfx.strokeEllipse(eyeX, eyeY, eyeW, Math.max(1, eyeH));

    if (openRatio > 0.2) {
      const px = eyeX + pupilTrackX;
      const py = eyeY + pupilTrackY;
      const pupilH = Math.min(10, eyeH * 0.85);

      this.eyeGfx.fillStyle(pupilColor, activeAlpha * 0.9);
      this.eyeGfx.fillEllipse(px, py, 2.8, pupilH);

      this.eyeGfx.fillStyle(0xffffff, activeAlpha * 0.8);
      this.eyeGfx.fillCircle(px - 1, py - pupilH * 0.25, 1.2);
    }
  }

  /* ── Fog Wisps ──────────────────────────────────────── */

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

  /* ── Spores (Wilderness) ────────────────────────────── */

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

  /* ── Embers (Danger) ────────────────────────────────── */

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
