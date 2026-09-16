"use client";

import { useEffect, useRef, useState, memo } from "react";
import { Activity, HeartPulse } from "lucide-react";

interface BiometricHeartbeatMonitorProps {
  isDanger?: boolean;
  className?: string;
}

export const BiometricHeartbeatMonitor = memo(function BiometricHeartbeatMonitor({
  isDanger = false,
  className = "",
}: BiometricHeartbeatMonitorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDangerRef = useRef(isDanger);
  isDangerRef.current = isDanger; // Immediate sync on every render

  const [bpm, setBpm] = useState(80);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let dpr = window.devicePixelRatio || 1;
    let cssWidth = canvas.parentElement?.clientWidth || 280;
    let cssHeight = 22;

    // Continuous points buffer (size = cssWidth) - PERSISTENT, NEVER CLEARED
    const targetLen = Math.max(10, Math.ceil(cssWidth));
    const points: number[] = new Array(targetLen).fill(cssHeight / 2);
    let sampleQueue: number[] = [];
    let restSamplesRemaining = 24;
    let prevDanger = isDangerRef.current;

    function resizeCanvas() {
      if (!canvas || !canvas.parentElement) return;
      dpr = window.devicePixelRatio || 1;
      cssWidth = canvas.parentElement.clientWidth || 280;
      cssHeight = 22;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      const newLen = Math.max(10, Math.ceil(cssWidth));
      while (points.length < newLen) {
        points.unshift(cssHeight / 2);
      }
      while (points.length > newLen) {
        points.shift();
      }
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Biological P-Q-R-S-T pulse builder
    function generateNextBeat(danger: boolean) {
      const amp = (danger ? 1.08 : 0.9) * (0.88 + Math.random() * 0.24);

      // Multi-sample smooth physiological curve
      const pWave = [0.3, 0.9, 1.8, 2.2, 1.8, 0.9, 0.3].map((v) => v * amp);
      const prSeg = [0, 0, -0.2];
      const qWave = [-0.8, -1.8].map((v) => v * amp);
      const rPeak = [2.2, 7.8, 6.2, 1.2].map((v) => v * amp);
      const sWave = [-2.2, -4.2, -1.8].map((v) => v * amp);
      const stSeg = [0, 0.2, 0];
      const tWave = [0.4, 1.1, 2.0, 2.8, 3.2, 3.2, 2.8, 2.0, 1.1, 0.4].map((v) => v * amp);
      const uWave = [0.3, 0];

      return [...pWave, ...prSeg, ...qWave, ...rPeak, ...sWave, ...stSeg, ...tWave, ...uWave];
    }

    let lastBeatTimestamp = performance.now();
    const bpmHistory: number[] = [80];

    function updateBpm(intervalMs: number, danger: boolean) {
      if (intervalMs <= 0) return;
      const rawBpm = Math.round(60000 / intervalMs);
      const clampedBpm = danger
        ? Math.max(135, Math.min(160, rawBpm))
        : Math.max(72, Math.min(90, rawBpm));

      bpmHistory.push(clampedBpm);
      if (bpmHistory.length > 3) bpmHistory.shift();
      const avgBpm = Math.round(bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length);
      setBpm(avgBpm);
    }

    // Fractional speed accumulator for seamless variable-speed scrolling
    let speedAccumulator = 0;

    function render() {
      if (!ctx || !canvas) return;

      const danger = isDangerRef.current;
      const midY = cssHeight / 2;

      // On hover transition: if entering danger, shorten current rest so elevated pulse responds quickly
      if (danger && !prevDanger) {
        if (restSamplesRemaining > 14) {
          restSamplesRemaining = 14;
        }
      }
      prevDanger = danger;

      // Speed: exactly 1.0 sample/frame normally, 2.8 samples/frame when hovering (accelerated scan)
      const speed = danger ? 2.6 : 1.0;
      speedAccumulator += speed;
      const steps = Math.floor(speedAccumulator);
      speedAccumulator -= steps;

      for (let s = 0; s < steps; s += 1) {
        if (sampleQueue.length > 0) {
          const delta = sampleQueue.shift()!;
          const noise = (Math.random() - 0.5) * 0.35;
          const safeY = Math.max(2.5, Math.min(cssHeight - 2.5, midY - (delta + noise)));
          points.shift();
          points.push(safeY);
        } else {
          restSamplesRemaining -= 1;
          const noise = (Math.random() - 0.5) * 0.4;
          const baselineY = midY + noise;
          points.shift();
          points.push(baselineY);

          if (restSamplesRemaining <= 0) {
            sampleQueue = generateNextBeat(danger);
            // Heart Rate Variability: interval between beats (tighter intervals in danger mode)
            restSamplesRemaining = danger
              ? Math.floor(14 + Math.random() * 8)
              : Math.floor(48 + Math.random() * 26);

            const now = performance.now();
            const beatDuration = now - lastBeatTimestamp;
            lastBeatTimestamp = now;
            updateBpm(beatDuration, danger);
          }
        }
      }

      // Drawing with High-DPI Context
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      // Deep, muted red for danger, cyan for stable
      const primaryColor = danger ? "#c44155" : "#00f0ff";
      const glowColor = danger ? "rgba(196, 65, 85, 0.45)" : "rgba(0, 240, 255, 0.4)";
      const gridColor = danger ? "rgba(196, 65, 85, 0.08)" : "rgba(0, 240, 255, 0.05)";

      // 1. Micro ECG Grid Lines
      ctx.strokeStyle = gridColor;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let x = 0; x < cssWidth; x += 16) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, cssHeight);
      }
      for (let y = 4; y < cssHeight; y += 7) {
        ctx.moveTo(0, y);
        ctx.lineTo(cssWidth, y);
      }
      ctx.stroke();

      // 2. High-Precision ECG Waveform Line
      ctx.shadowBlur = danger ? 7 : 5;
      ctx.shadowColor = glowColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = danger ? 1.25 : 1.05;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      ctx.beginPath();
      for (let i = 0; i < points.length; i += 1) {
        const x = i;
        const y = points[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 3. Leading Cursor Dot at the rightmost scanning edge
      const latestY = points[points.length - 1] || midY;
      ctx.shadowBlur = 8;
      ctx.shadowColor = primaryColor;
      ctx.fillStyle = danger ? "#ffd6dc" : "#99f7ff";
      ctx.beginPath();
      ctx.arc(cssWidth - 2, latestY, danger ? 2.0 : 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []); // Animation loop runs once on mount, points buffer is NEVER reset!

  return (
    <div className={`biometric-heartbeat-wrap ${isDanger ? "is-danger-state" : ""} ${className}`}>
      <div className="biometric-meta-header">
        <div className="biometric-tag">
          {isDanger ? (
            <HeartPulse size={12} className="text-danger-pulse animate-bounce" />
          ) : (
            <Activity size={12} className="text-cyan" />
          )}
          <span>{isDanger ? "NEURAL OVERDRIVE // HIGH STAKES" : "BIOMETRIC & NEURAL SYNC"}</span>
        </div>
        <div className="biometric-bpm-badge">
          <strong className={isDanger ? "text-danger" : "text-cyan"}>{bpm}</strong>
          <small>BPM {isDanger ? "[ELEVATED]" : "[STABLE]"}</small>
        </div>
      </div>

      <div className="biometric-canvas-container">
        <canvas ref={canvasRef} className="biometric-ecg-canvas" />
      </div>
    </div>
  );
});
