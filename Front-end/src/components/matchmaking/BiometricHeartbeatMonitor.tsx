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

    function resizeCanvas() {
      if (!canvas || !canvas.parentElement) return;
      dpr = window.devicePixelRatio || 1;
      cssWidth = canvas.parentElement.clientWidth || 280;
      cssHeight = 22;
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Continuous points buffer (size = cssWidth)
    const points: number[] = new Array(Math.ceil(cssWidth)).fill(cssHeight / 2);
    let sampleQueue: number[] = [];
    let restSamplesRemaining = 30;

    // Biological P-Q-R-S-T pulse builder
    function generateNextBeat(danger: boolean) {
      const amp = (danger ? 1.05 : 0.9) * (0.88 + Math.random() * 0.24); // Biological amplitude variance (±12%)
      
      // Multi-sample smooth physiological curve
      const pWave = [0.3, 0.9, 1.8, 2.2, 1.8, 0.9, 0.3].map((v) => v * amp);
      const prSeg = [0, 0, -0.2];
      const qWave = [-0.8, -1.8].map((v) => v * amp);
      const rPeak = [2.2, 7.8, 6.2, 1.2].map((v) => v * amp); // Clamped apex spike (stays within bounds)
      const sWave = [-2.2, -4.2, -1.8].map((v) => v * amp);
      const stSeg = [0, 0.2, 0];
      const tWave = [0.4, 1.1, 2.0, 2.8, 3.2, 3.2, 2.8, 2.0, 1.1, 0.4].map((v) => v * amp);
      const uWave = [0.3, 0];

      return [...pWave, ...prSeg, ...qWave, ...rPeak, ...sWave, ...stSeg, ...tWave, ...uWave];
    }

    // Dynamic BPM calculation based on beat interval
    let lastBeatTimestamp = performance.now();
    const bpmHistory: number[] = [80];

    function updateBpm(intervalMs: number) {
      if (intervalMs <= 0) return;
      const rawBpm = Math.round((60000 / intervalMs));
      const clampedBpm = isDanger 
        ? Math.max(130, Math.min(160, rawBpm)) 
        : Math.max(70, Math.min(92, rawBpm));
      
      bpmHistory.push(clampedBpm);
      if (bpmHistory.length > 3) bpmHistory.shift();
      const avgBpm = Math.round(bpmHistory.reduce((a, b) => a + b, 0) / bpmHistory.length);
      setBpm(avgBpm);
    }

    function render() {
      if (!ctx || !canvas) return;

      const midY = cssHeight / 2;

      // Advance sample queue
      if (sampleQueue.length > 0) {
        const delta = sampleQueue.shift()!;
        const noise = (Math.random() - 0.5) * 0.35; // Fine biological micro-jitter
        // Clamping safe bounds: Never touch top or bottom border
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
          sampleQueue = generateNextBeat(isDanger);
          // Heart Rate Variability: interval between beats
          restSamplesRemaining = isDanger 
            ? Math.floor(20 + Math.random() * 14) 
            : Math.floor(48 + Math.random() * 26);

          const now = performance.now();
          const beatDuration = now - lastBeatTimestamp;
          lastBeatTimestamp = now;
          updateBpm(beatDuration);
        }
      }

      // Drawing with High-DPI Context
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, cssWidth, cssHeight);

      const primaryColor = isDanger ? "#ff0044" : "#00f0ff";
      const glowColor = isDanger ? "rgba(255, 0, 68, 0.55)" : "rgba(0, 240, 255, 0.4)";
      const gridColor = isDanger ? "rgba(255, 0, 68, 0.06)" : "rgba(0, 240, 255, 0.05)";

      // 1. Micro ECG Grid Lines (Modern, minimalist, subtle 16px grid)
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
      ctx.shadowBlur = isDanger ? 8 : 5;
      ctx.shadowColor = glowColor;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = isDanger ? 1.25 : 1.05;
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
      ctx.shadowBlur = 10;
      ctx.shadowColor = primaryColor;
      ctx.fillStyle = isDanger ? "#fff" : "#99f7ff";
      ctx.beginPath();
      ctx.arc(cssWidth - 2, latestY, isDanger ? 2.2 : 1.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [isDanger]);

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
