"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Music,
  X,
  Sliders,
  ShieldCheck,
  Radio,
  Play,
  Check,
  Zap,
} from "lucide-react";
import { useGlobalAudio } from "../../contexts/AudioContext";

interface GlobalSoundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSoundModal: React.FC<GlobalSoundModalProps> = ({ isOpen, onClose }) => {
  const {
    settings,
    setMasterVolume,
    setMusicVolume,
    setEffectsVolume,
    toggleMasterMute,
    toggleMusicMute,
    toggleEffectsMute,
    playSfx,
  } = useGlobalAudio();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeChannel, setActiveChannel] = useState<"master" | "music" | "effects">("master");

  // Sound on open & close only
  useEffect(() => {
    if (isOpen) {
      playSfx("modal_open");
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          playSfx("modal_close");
          onClose();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose, playSfx]);

  const handleClose = useCallback(() => {
    playSfx("modal_close");
    onClose();
  }, [onClose, playSfx]);

  // Pure silent slider change handler without chart/slider sound
  const handleSliderChange = (
    type: "master" | "music" | "effects",
    val: number
  ) => {
    if (type === "master") setMasterVolume(val);
    else if (type === "music") setMusicVolume(val);
    else setEffectsVolume(val);
  };

  // Procedural Cyberpunk Holographic VU / Wave Canvas Animation (strictly visual & silent)
  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let time = 0;

    const resize = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 480;
      canvas.height = 90;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      time += 0.04;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Cyber Grid background
      ctx.strokeStyle = "rgba(14, 165, 233, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 16;
      for (let x = 0; x < w; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Animated Frequency Visualizer Bars
      const numBars = 32;
      const barWidth = (w - (numBars - 1) * 3) / numBars;
      const masterScale = settings.masterMuted ? 0 : settings.masterVolume / 100;
      const musicScale = settings.musicMuted ? 0 : settings.musicVolume / 100;
      const effectsScale = settings.effectsMuted ? 0 : settings.effectsVolume / 100;
      const totalEnergy = masterScale * (0.6 * musicScale + 0.4 * effectsScale);

      for (let i = 0; i < numBars; i++) {
        const freqRatio = i / numBars;
        const wave1 = Math.sin(time * 3 + i * 0.45);
        const wave2 = Math.cos(time * 2 - i * 0.3);
        const barHeight = Math.max(
          4,
          (wave1 * 0.4 + wave2 * 0.3 + 0.5) * (h * 0.75) * totalEnergy + (totalEnergy > 0.05 ? 6 : 2)
        );

        const x = i * (barWidth + 3);
        const y = h - barHeight;

        // Gradient for bars
        const grad = ctx.createLinearGradient(0, y, 0, h);
        if (freqRatio < 0.5) {
          grad.addColorStop(0, "rgba(6, 182, 212, 0.9)"); // Cyan
          grad.addColorStop(1, "rgba(14, 165, 233, 0.2)");
        } else if (freqRatio < 0.8) {
          grad.addColorStop(0, "rgba(59, 130, 246, 0.9)"); // Blue
          grad.addColorStop(1, "rgba(37, 99, 235, 0.2)");
        } else {
          grad.addColorStop(0, "rgba(217, 70, 239, 0.9)"); // Purple/Magenta
          grad.addColorStop(1, "rgba(168, 85, 247, 0.2)");
        }

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);

        // Peak dot
        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.fillRect(x, y - 2, barWidth, 2);
      }

      // Oscilloscope Sine wave overlay
      ctx.beginPath();
      ctx.strokeStyle = "rgba(45, 212, 191, 0.75)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x < w; x += 4) {
        const norm = x / w;
        const sinVal = Math.sin(norm * 12 + time * 4) * Math.cos(norm * 6 - time * 2);
        const yVal = h / 2 + sinVal * 20 * totalEnergy;
        if (x === 0) ctx.moveTo(x, yVal);
        else ctx.lineTo(x, yVal);
      }
      ctx.stroke();

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [isOpen, settings]);

  if (!isOpen) return null;

  return (
    <div
      className="audio-matrix-modal fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleClose}
    >
      {/* Modal Dialog Card - Strict 90-degree square corners */}
      <div
        style={{ borderRadius: 0 }}
        className="relative w-[92vw] max-w-lg !rounded-none [border-radius:0px!important] border-2 border-cyan-500/50 bg-[#060a14]/98 p-6 shadow-[0_0_50px_rgba(6,182,212,0.3)] backdrop-blur-2xl text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Holographic 90-degree sharp corner brackets */}
        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-cyan-300 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-cyan-300 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-cyan-300 pointer-events-none" />

        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee]" />

        {/* Header - Tactical HUD Style */}
        <div className="flex items-center justify-between pb-4 border-b border-cyan-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-none bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.35)]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-widest font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-teal-200 to-amber-200 uppercase">
                  AUDIO MATRIX
                </h2>
                <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 uppercase">
                  SYSTEM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-widest font-mono">
                CHRONO GENESIS SOUND ENGINE v2.4 // PHASER
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ borderRadius: 0 }}
            className="audio-matrix-modal__close w-9 h-9 flex items-center justify-center !rounded-none [border-radius:0px!important] border border-slate-700/80 bg-slate-900/80 text-slate-300 hover:text-cyan-200 hover:border-cyan-400 hover:bg-cyan-950/60 hover:shadow-[0_0_14px_rgba(6,182,212,0.4)] transition-all active:scale-95"
            title="Close Settings (Esc)"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Live Spectrogram Waveform (Silent visual HUD) */}
        <div className="my-4 rounded-none border border-cyan-900/60 bg-[#03060c] p-2.5 shadow-inner">
          <div className="flex items-center justify-between text-[11px] font-mono text-cyan-400/90 mb-1.5 px-0.5">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <Radio className="w-3 h-3 text-cyan-400 animate-pulse" />
              LIVE SPECTROGRAM // VISUAL MONITOR
            </span>
            <span className="text-slate-400 font-mono text-[10px]">
              {settings.masterMuted
                ? "OUTPUT MUTED"
                : `${settings.masterVolume}% MASTER · ${settings.musicMuted ? "BGM OFF" : `${settings.musicVolume}% BGM`} · ${settings.effectsMuted ? "SFX OFF" : `${settings.effectsVolume}% SFX`}`}
            </span>
          </div>
          <canvas
            ref={canvasRef}
            className="w-full h-[80px] rounded-none bg-[#02050b] border border-cyan-950/40"
          />
        </div>

        {/* Sliders Container */}
        <div className="space-y-3.5">
          {/* Master Volume */}
          <div
            className={`p-3 rounded-none border transition-all ${
              activeChannel === "master"
                ? "bg-cyan-950/30 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.18)]"
                : "bg-slate-950/50 border-slate-800"
            }`}
            onMouseEnter={() => setActiveChannel("master")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    toggleMasterMute();
                  }}
                  style={{ borderRadius: 0 }}
                  className={`audio-matrix-modal__channel-toggle audio-matrix-modal__channel-toggle--master w-8 h-8 flex items-center justify-center !rounded-none [border-radius:0px!important] transition-all active:scale-95 ${
                    settings.masterMuted
                      ? "is-muted bg-rose-950/80 text-rose-300 border border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:bg-rose-900/80 hover:border-rose-400"
                      : "bg-cyan-950/80 text-cyan-300 border border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.35)] hover:bg-cyan-900/80 hover:border-cyan-400"
                  }`}
                  title={settings.masterMuted ? "Unmute Master" : "Mute Master"}
                >
                  {settings.masterMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
                <span className="text-xs font-bold tracking-wider font-mono text-slate-200 uppercase">
                  MASTER VOLUME
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-cyan-300">
                {settings.masterMuted ? "MUTED" : `${settings.masterVolume}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.masterVolume}
              onChange={(e) => handleSliderChange("master", Number(e.target.value))}
              disabled={settings.masterMuted}
              className="cyber-slider-range"
            />
          </div>

          {/* Music Volume */}
          <div
            className={`p-3 rounded-none border transition-all ${
              activeChannel === "music"
                ? "bg-indigo-950/30 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.18)]"
                : "bg-slate-950/50 border-slate-800"
            }`}
            onMouseEnter={() => setActiveChannel("music")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    toggleMusicMute();
                  }}
                  style={{ borderRadius: 0 }}
                  className={`audio-matrix-modal__channel-toggle audio-matrix-modal__channel-toggle--music w-8 h-8 flex items-center justify-center !rounded-none [border-radius:0px!important] transition-all active:scale-95 ${
                    settings.musicMuted
                      ? "is-muted bg-rose-950/80 text-rose-300 border border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:bg-rose-900/80 hover:border-rose-400"
                      : "bg-indigo-950/80 text-indigo-300 border border-indigo-500/60 shadow-[0_0_12px_rgba(99,102,241,0.35)] hover:bg-indigo-900/80 hover:border-indigo-400"
                  }`}
                  title={settings.musicMuted ? "Unmute Music" : "Mute Music"}
                >
                  {settings.musicMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Music className="w-4 h-4" />
                  )}
                </button>
                <span className="text-xs font-bold tracking-wider font-mono text-slate-200 uppercase">
                  MUSIC (BGM)
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-300">
                {settings.musicMuted ? "MUTED" : `${settings.musicVolume}%`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.musicVolume}
              onChange={(e) => handleSliderChange("music", Number(e.target.value))}
              disabled={settings.musicMuted || settings.masterMuted}
              className="cyber-slider-range cyber-slider-range--music"
            />
          </div>

          {/* Effects Volume */}
          <div
            className={`p-3 rounded-none border transition-all ${
              activeChannel === "effects"
                ? "bg-fuchsia-950/30 border-fuchsia-500/60 shadow-[0_0_20px_rgba(217,70,239,0.18)]"
                : "bg-slate-950/50 border-slate-800"
            }`}
            onMouseEnter={() => setActiveChannel("effects")}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    playSfx("click");
                    toggleEffectsMute();
                  }}
                  style={{ borderRadius: 0 }}
                  className={`audio-matrix-modal__channel-toggle audio-matrix-modal__channel-toggle--effects w-8 h-8 flex items-center justify-center !rounded-none [border-radius:0px!important] transition-all active:scale-95 ${
                    settings.effectsMuted
                      ? "is-muted bg-rose-950/80 text-rose-300 border border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.4)] hover:bg-rose-900/80 hover:border-rose-400"
                      : "bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/60 shadow-[0_0_12px_rgba(217,70,239,0.35)] hover:bg-fuchsia-900/80 hover:border-fuchsia-400"
                  }`}
                  title={settings.effectsMuted ? "Unmute Effects" : "Mute Effects"}
                >
                  {settings.effectsMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Zap className="w-4 h-4 fill-fuchsia-400/20" />
                  )}
                </button>
                <span className="text-xs font-bold tracking-wider font-mono text-slate-200 uppercase">
                  SOUND EFFECTS (SFX)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playSfx("success")}
                  disabled={settings.effectsMuted || settings.masterMuted}
                  style={{ borderRadius: 0 }}
                  className="audio-matrix-modal__test-sfx inline-flex items-center gap-1.5 px-3 py-1 font-mono text-[10.5px] font-bold tracking-wider !rounded-none [border-radius:0px!important] bg-fuchsia-950/80 border border-fuchsia-500/60 text-fuchsia-300 hover:bg-fuchsia-900/80 hover:border-fuchsia-400 hover:text-white shadow-[0_0_12px_rgba(217,70,239,0.3)] transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none"
                  title="Test Sound Effects"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>TEST SFX</span>
                </button>
                <span className="text-xs font-mono font-bold text-fuchsia-300">
                  {settings.effectsMuted ? "MUTED" : `${settings.effectsVolume}%`}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={settings.effectsVolume}
              onChange={(e) => handleSliderChange("effects", Number(e.target.value))}
              disabled={settings.effectsMuted || settings.masterMuted}
              className="cyber-slider-range cyber-slider-range--effects"
            />
          </div>
        </div>

        {/* Footer / Status bar - Tactical Phaser Theme */}
        <div className="mt-5 pt-3 border-t border-cyan-900/40 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-cyan-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>GLOBAL AUDIO PERSISTENCE ACTIVE</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ borderRadius: 0 }}
            className="audio-matrix-modal__confirm inline-flex items-center gap-2 px-6 py-2.5 font-mono font-bold text-xs tracking-widest uppercase !rounded-none [border-radius:0px!important] border border-cyan-400/80 bg-gradient-to-r from-cyan-600 via-teal-600 to-cyan-500 hover:from-cyan-500 hover:to-teal-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.45)] hover:shadow-[0_0_28px_rgba(6,182,212,0.7)] transition-all active:scale-95"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>CONFIRM & CLOSE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
