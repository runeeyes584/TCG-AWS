"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Swords, Trophy, Zap } from "lucide-react";
import type Phaser from "phaser";
import { MatchAvatarFrame } from "./MatchAvatarFrame";

export interface ShowcasePlayer {
  username: string;
  avatar?: string;
  elo?: number;
  title?: string;
}

interface MatchFoundShowcaseProps {
  localPlayer: ShowcasePlayer;
  opponent: ShowcasePlayer;
  onComplete: () => void;
  durationSeconds?: number;
}

function playCyborgSfx(type: "intro" | "tick" | "urgent" | "warp") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === "intro") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.65);
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.75);
    } else if (type === "tick") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === "urgent") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(1150, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (type === "warp") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(280, now);
      osc.frequency.exponentialRampToValueAtTime(1500, now + 0.38);
      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch {
    // Gracefully ignore audio restrictions
  }
}

export function MatchFoundShowcase({
  localPlayer,
  opponent,
  onComplete,
  durationSeconds = 10,
}: MatchFoundShowcaseProps) {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const canvasRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const handleComplete = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    playCyborgSfx("warp");
    onCompleteRef.current();
  };

  // Intro sound & Hardware Fallback Safety Timeout (Zero Deadlock Guarantee)
  useEffect(() => {
    playCyborgSfx("intro");
    const safetyTimer = setTimeout(() => {
      handleComplete();
    }, (durationSeconds + 0.35) * 1000);

    return () => clearTimeout(safetyTimer);
  }, [durationSeconds]);

  // Countdown interval (pure state decrement)
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Safely trigger audio on tick & onComplete outside state reducer when countdown finishes
  useEffect(() => {
    if (timeLeft === 0) {
      handleComplete();
    } else if (timeLeft <= 2) {
      playCyborgSfx("urgent");
    } else {
      playCyborgSfx("tick");
    }
  }, [timeLeft]);

  // Phaser Clash & Lightning Shockwave Canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser").then((mod) => {
      const PhaserRuntime = (mod as any).default || mod;
      if (disposed || !canvasRef.current) return;

      class ClashVfxScene extends PhaserRuntime.Scene {
        private energyGraphics!: Phaser.GameObjects.Graphics;
        private shockwaves: Phaser.GameObjects.Arc[] = [];
        private lightningTimer?: Phaser.Time.TimerEvent;

        constructor() {
          super("match-clash-vfx");
        }

        create() {
          this.energyGraphics = this.add.graphics().setBlendMode(PhaserRuntime.BlendModes.ADD);
          this.createClashShockwave();

          this.lightningTimer = this.time.addEvent({
            delay: 1100,
            loop: true,
            callback: this.spawnClashLightning,
            callbackScope: this,
          });

          this.scale.on("resize", this.handleResize, this);
        }

        private createClashShockwave() {
          const { width, height } = this.scale;
          const cx = width / 2;
          const cy = height / 2;

          for (let i = 0; i < 3; i += 1) {
            const wave = this.add.circle(cx, cy, 30, i % 2 === 0 ? 0x00f0ff : 0xff0055, 0)
              .setStrokeStyle(2, i % 2 === 0 ? 0x00f0ff : 0xff0055, 0.8)
              .setBlendMode(PhaserRuntime.BlendModes.ADD);
            this.shockwaves.push(wave);

            this.tweens.add({
              targets: wave,
              radius: Math.min(width, height) * 0.7,
              alpha: 0,
              duration: 1800,
              delay: i * 350,
              repeat: -1,
              ease: "Cubic.out",
            });
          }
        }

        private spawnClashLightning() {
          const { width, height } = this.scale;
          const leftX = width * 0.25;
          const rightX = width * 0.75;
          const cy = height * 0.5;

          let step = 0;
          this.time.addEvent({
            delay: 40,
            repeat: 3,
            callback: () => {
              this.energyGraphics.clear();
              step += 1;
              if (step % 2 === 0) return;

              const segments = 12;
              this.energyGraphics.lineStyle(2, 0xffffff, 0.9);
              this.energyGraphics.beginPath();
              this.energyGraphics.moveTo(leftX, cy);

              for (let i = 1; i <= segments; i += 1) {
                const t = i / segments;
                const x = PhaserRuntime.Math.Linear(leftX, rightX, t);
                const y = cy + (i === segments ? 0 : PhaserRuntime.Math.Between(-35, 35));
                this.energyGraphics.lineTo(x, y);
              }
              this.energyGraphics.strokePath();

              if (step === 3) {
                this.time.delayedCall(50, () => this.energyGraphics.clear());
              }
            },
          });
        }

        private handleResize() {
          this.shockwaves.forEach((w) => {
            this.tweens.killTweensOf(w);
            w.destroy();
          });
          this.shockwaves = [];
          this.energyGraphics.clear();
          this.createClashShockwave();
        }

        shutdown() {
          this.lightningTimer?.destroy();
          this.scale.off("resize", this.handleResize, this);
        }
      }

      game = new PhaserRuntime.Game({
        type: PhaserRuntime.CANVAS,
        parent: canvasRef.current,
        transparent: true,
        backgroundColor: "rgba(0,0,0,0)",
        scene: ClashVfxScene,
        scale: {
          mode: PhaserRuntime.Scale.RESIZE,
          width: canvasRef.current.clientWidth,
          height: canvasRef.current.clientHeight,
        },
        render: { antialias: true },
        audio: { noAudio: true },
      });
    }).catch(() => undefined);

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  const progressPercent = (timeLeft / durationSeconds) * 100;
  const isUrgent = timeLeft <= 2;

  return (
    <motion.div
      className="match-found-showcase"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      aria-label="Match Found Showcase"
    >
      {/* Background Phaser Canvas & Atmospheric Glow */}
      <div className="showcase-art-canvas" ref={canvasRef} aria-hidden="true" />
      <div className="showcase-dark-vignette" aria-hidden="true" />
      <div className="cyborg-scanlines-overlay" aria-hidden="true" />

      {/* Top Banner Alert */}
      <motion.div
        className="showcase-top-banner"
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
      >
        <div className="banner-glow-tag cyborg-banner">
          <Zap size={15} className="banner-zap-icon" />
          <span>CYBORG PROTOCOL // NEURAL COMBAT LINK ACTIVE</span>
          <Zap size={15} className="banner-zap-icon" />
        </div>
      </motion.div>

      {/* Versus Center Stage (Clash of 2 Opponents) */}
      <div className="showcase-arena">
        {/* Left Side: Local Player (Cyan) */}
        <motion.div
          className="showcase-gladiator gladiator-left cyborg-card"
          initial={{ x: -80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="cyborg-hud-corner corner-tl" aria-hidden="true" />
          <div className="cyborg-hud-corner corner-tr" aria-hidden="true" />
          <div className="cyborg-hud-corner corner-bl" aria-hidden="true" />
          <div className="cyborg-hud-corner corner-br" aria-hidden="true" />

          <div className="gladiator-tag">
            <ShieldCheck size={14} />
            <span>OPERATIVE (YOU)</span>
          </div>

          <div className="gladiator-avatar-wrap">
            <MatchAvatarFrame
              avatarUrl={localPlayer.avatar}
              name={localPlayer.username}
              size="xl"
              theme="cyan"
            />
          </div>

          <div className="gladiator-dossier">
            <h2 className="gladiator-name">{localPlayer.username}</h2>
            <span className="gladiator-title">{localPlayer.title ?? "Prism Vanguard"}</span>

            <div className="gladiator-stat-pill">
              <Trophy size={14} className="text-gold" />
              <strong>{localPlayer.elo?.toLocaleString() ?? "1,200"} ELO</strong>
            </div>

            <div className="cyborg-telemetry-badge">
              <span>SYS: ARMED</span>
              <span>SYNC: 100%</span>
              <span>LATENCY: 0.12ms</span>
            </div>
          </div>
        </motion.div>

        {/* Center Clash "VS" & 10s Countdown */}
        <motion.div
          className="showcase-center-clash"
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.1, type: "spring", stiffness: 220 }}
        >
          <div className={`vs-emblem cyborg-vs-emblem ${isUrgent ? "is-urgent-glitch" : ""}`}>
            <Swords size={36} className="vs-swords-icon" />
            <span className="vs-text">VS</span>
            <div className="vs-energy-ring" aria-hidden="true" />
          </div>

          {/* 10s Circular Timer Countdown */}
          <div className={`countdown-dial ${isUrgent ? "is-urgent" : ""}`}>
            <svg className="countdown-svg" viewBox="0 0 100 100">
              <circle className="countdown-track" cx="50" cy="50" r="44" />
              <circle
                className="countdown-progress"
                cx="50"
                cy="50"
                r="44"
                strokeDasharray={276.46}
                strokeDashoffset={276.46 - (276.46 * progressPercent) / 100}
              />
            </svg>
            <div className="countdown-number">
              <strong>{timeLeft}</strong>
              <small>SEC</small>
            </div>
          </div>

          <p className="clash-subtext cyborg-subtext">
            {isUrgent
              ? "CRITICAL ENGAGEMENT INCOMING // ENTERING ARENA"
              : "LINK SYNCHRONIZED"}
          </p>

          <button
            type="button"
            className="ready-now-btn cyborg-engage-btn"
            onClick={handleComplete}
            aria-label="Skip countdown and enter arena immediately"
          >
            ENTER ARENA NOW
          </button>
        </motion.div>

        {/* Right Side: Opponent (Crimson / Violet) */}
        <motion.div
          className="showcase-gladiator gladiator-right cyborg-card"
          initial={{ x: 80, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="cyborg-hud-corner corner-tl" aria-hidden="true" />
          <div className="cyborg-hud-corner corner-tr" aria-hidden="true" />
          <div className="cyborg-hud-corner corner-bl" aria-hidden="true" />
          <div className="cyborg-hud-corner corner-br" aria-hidden="true" />

          <div className="gladiator-tag hostile-tag">
            <Zap size={14} />
            <span>RIVAL COMBATANT</span>
          </div>

          <div className="gladiator-avatar-wrap">
            <MatchAvatarFrame
              avatarUrl={opponent.avatar}
              name={opponent.username}
              size="xl"
              theme="crimson"
            />
          </div>

          <div className="gladiator-dossier">
            <h2 className="gladiator-name">{opponent.username}</h2>
            <span className="gladiator-title">{opponent.title ?? "Nexus Contender"}</span>

            <div className="gladiator-stat-pill">
              <Trophy size={14} className="text-gold" />
              <strong>{opponent.elo?.toLocaleString() ?? "1,200"} ELO</strong>
            </div>

            <div className="cyborg-telemetry-badge hostile">
              <span>THREAT: S-RANK</span>
              <span>CORE: ACTIVE</span>
              <span>OVERCLOCK: 100%</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
