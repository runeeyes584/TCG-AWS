"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LogOut, ShieldAlert, ArrowLeft, AlertTriangle, X, RotateCcw } from "lucide-react";
import { useGlobalAudio } from "../../contexts/AudioContext";
import type Phaser from "phaser";

interface SignOutConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function SignOutConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: SignOutConfirmDialogProps) {
  const { playSfx } = useGlobalAudio();

  useEffect(() => {
    if (isOpen) {
      playSfx("warning");
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSubmitting) {
          playSfx("modal_close");
          onCancel();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onCancel, playSfx, isSubmitting]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="signout-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-dialog-title"
        onClick={() => {
          if (!isSubmitting) {
            playSfx("modal_close");
            onCancel();
          }
        }}
      >
        <section
          className="signout-modal-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Ambient Top Laser Glow Line */}
          <div className="signout-modal-panel__laser" aria-hidden="true" />

          {/* Ambient Radial Glow & Cyber Grid */}
          <div className="signout-modal-panel__glow" aria-hidden="true" />
          <div className="signout-modal-panel__grid" aria-hidden="true" />

          {/* Holographic 90-Degree Sharp Corner Brackets */}
          <div className="signout-modal-corner signout-modal-corner--tl" aria-hidden="true" />
          <div className="signout-modal-corner signout-modal-corner--tr" aria-hidden="true" />
          <div className="signout-modal-corner signout-modal-corner--bl" aria-hidden="true" />
          <div className="signout-modal-corner signout-modal-corner--br" aria-hidden="true" />

          {/* Header: Protocol Badge + Rapid Close X */}
          <div className="signout-modal-header">
            <div className="signout-modal-badge">
              <ShieldAlert size={13} className="signout-modal-badge__icon" />
              <span>SECURITY PROTOCOL // TERMINATION</span>
            </div>
            <button
              type="button"
              className="signout-modal-close"
              onClick={() => {
                playSfx("modal_close");
                onCancel();
              }}
              disabled={isSubmitting}
              title="Close (Esc)"
              aria-label="Close dialog"
            >
              <X size={15} />
            </button>
          </div>

          {/* Body: Phaser Holographic Reactor + Message */}
          <div className="signout-modal-body">
            <div className="signout-modal-visual" aria-hidden="true">
              <SignOutPhaserVisualizer />
              {/* Crisp Central Alert Vector Icon */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <AlertTriangle
                  size={24}
                  className="text-rose-200 drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]"
                />
              </div>
            </div>

            <h2 id="signout-dialog-title" className="signout-modal-title">
              TERMINATE ACTIVE SESSION?
            </h2>
            <p className="signout-modal-desc">
              Signing out will disconnect your neural link, forfeit any active matchmaking queue, and return to the Chrono Genesis gate.
            </p>

            {/* High-Tech Telemetry Status Line */}
            <div className="signout-modal-telemetry" aria-hidden="true">
              <span className="signout-modal-telemetry__dot" />
              <span>LINK: SYNCHRONIZED</span>
              <span className="signout-modal-telemetry__sep">/</span>
              <span>DISCONNECT: IMMEDIATE</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="signout-modal-actions">
            <button
              type="button"
              className="signout-modal-btn signout-modal-btn--stay"
              onClick={() => {
                playSfx("click");
                onCancel();
              }}
              disabled={isSubmitting}
              autoFocus
            >
              <ArrowLeft size={16} />
              <span>STAY IN LOBBY</span>
            </button>
            <button
              type="button"
              className="signout-modal-btn signout-modal-btn--confirm"
              onClick={() => {
                playSfx("sign_out");
                onConfirm();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RotateCcw size={16} className="signout-modal-spinner" />
                  <span>DISCONNECTING...</span>
                </>
              ) : (
                <>
                  <LogOut size={16} />
                  <span>SIGN OUT</span>
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}

/**
 * Lightweight Phaser 4.2.1 Mini-Visualizer for the Disconnection Security Core.
 * Follows Rule 3.3 for idempotent destruction, dual event listening, and Canvas mode.
 */
function SignOutPhaserVisualizer() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hostRef.current) return;

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    ) {
      return;
    }

    let game: Phaser.Game | undefined;
    let disposed = false;

    void import("phaser")
      .then((mod) => {
        const PhaserRuntime = (mod as any).default || mod;
        if (disposed || !hostRef.current) return;

        class DisconnectSecurityScene extends PhaserRuntime.Scene {
          private isSceneDestroyed = false;

          constructor() {
            super("signout-security-scene");
          }

          create() {
            this.events.once(PhaserRuntime.Scenes.Events.SHUTDOWN, this.destroyScene, this);
            this.events.once(PhaserRuntime.Scenes.Events.DESTROY, this.destroyScene, this);

            const centerX = 50;
            const centerY = 50;

            // 1. Central Ambient Breathing Core Glow
            const coreGlow = this.add.circle(centerX, centerY, 23, 0xe11d48, 0.28);
            this.tweens.add({
              targets: coreGlow,
              scale: 1.25,
              alpha: 0.5,
              duration: 850,
              repeat: -1,
              yoyo: true,
              ease: "Sine.easeInOut",
            });

            // 2. Tactical Hexagon Core Frame
            const coreHex = this.add.graphics();
            coreHex.fillStyle(0x4c0519, 0.88);
            coreHex.lineStyle(1.8, 0xf43f5e, 0.95);

            const hexPoints: { x: number; y: number }[] = [];
            for (let i = 0; i < 6; i++) {
              const a = (i * 60 - 30) * (Math.PI / 180);
              hexPoints.push({
                x: centerX + Math.cos(a) * 20,
                y: centerY + Math.sin(a) * 20,
              });
            }
            coreHex.beginPath();
            coreHex.moveTo(hexPoints[0].x, hexPoints[0].y);
            for (let i = 1; i < 6; i++) {
              coreHex.lineTo(hexPoints[i].x, hexPoints[i].y);
            }
            coreHex.closePath();
            coreHex.fillPath();
            coreHex.strokePath();

            // Hexagon vertex micro-nodes
            hexPoints.forEach((pt) => {
              this.add.circle(pt.x, pt.y, 1.4, 0xfecdd3, 0.9);
            });

            // 3. Quantum Sparks / Centrifugal Data Particles dispersing outward
            const colors = [0xf43f5e, 0xfb7185, 0x38bdf8, 0xfef08a, 0xf43f5e, 0xfb7185, 0x38bdf8, 0xfecdd3];
            colors.forEach((color, idx) => {
              const angle = (idx * (360 / colors.length) + 15) * (Math.PI / 180);
              const baseDist = 19;
              const targetDist = 40;
              const spark = this.add.circle(
                centerX + Math.cos(angle) * baseDist,
                centerY + Math.sin(angle) * baseDist,
                1.8,
                color,
                0.95
              );

              this.tweens.add({
                targets: spark,
                x: centerX + Math.cos(angle) * targetDist,
                y: centerY + Math.sin(angle) * targetDist,
                alpha: 0.05,
                scale: 0.5,
                duration: 1100 + (idx % 3) * 250,
                delay: idx * 140,
                repeat: -1,
                yoyo: true,
                ease: "Sine.easeInOut",
              });
            });
          }

          private destroyScene() {
            if (this.isSceneDestroyed) return;
            this.isSceneDestroyed = true;
            this.tweens.killAll();
            this.time.removeAllEvents();
          }
        }

        game = new PhaserRuntime.Game({
          type: PhaserRuntime.CANVAS,
          parent: hostRef.current,
          width: 100,
          height: 100,
          transparent: true,
          audio: { noAudio: true },
          render: { antialias: true },
          scene: DisconnectSecurityScene,
        });
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);

  return <div className="signout-modal-phaser-host" ref={hostRef} aria-hidden="true" />;
}

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}

