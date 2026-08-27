"use client";

import { useEffect, useRef, memo } from "react";

interface ConsolePhaserBackgroundProps {
  className?: string;
}

export const ConsolePhaserBackground = memo(function ConsolePhaserBackground({
  className = "",
}: ConsolePhaserBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let dpr = window.devicePixelRatio || 1;
    let width = canvas.parentElement?.clientWidth || 500;
    let height = canvas.parentElement?.clientHeight || 200;

    function resize() {
      if (!canvas || !canvas.parentElement) return;
      dpr = window.devicePixelRatio || 1;
      width = canvas.parentElement.clientWidth || 500;
      height = canvas.parentElement.clientHeight || 200;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    resize();
    window.addEventListener("resize", resize);

    // Micro Circuit Traces definitions (45° and 90° PCB Bus Lines)
    function getCircuits(w: number, h: number) {
      return [
        {
          color: "rgba(0, 240, 255, 0.16)",
          nodeColor: "#ffd700",
          pulseColor: "#00f0ff",
          points: [
            [w * 0.72, 10],
            [w * 0.85, 10],
            [w * 0.92, 22],
            [w * 0.96, 22],
          ],
          speed: 0.0035,
          delay: 0,
        },
        {
          color: "rgba(141, 107, 255, 0.16)",
          nodeColor: "#00f0ff",
          pulseColor: "#c084fc",
          points: [
            [w * 0.65, h * 0.42],
            [w * 0.82, h * 0.42],
            [w * 0.88, h * 0.52],
            [w * 0.94, h * 0.52],
          ],
          speed: 0.003,
          delay: 0.35,
        },
        {
          color: "rgba(0, 240, 255, 0.14)",
          nodeColor: "#ffd700",
          pulseColor: "#00f0ff",
          points: [
            [14, h * 0.76],
            [w * 0.16, h * 0.76],
            [w * 0.24, h * 0.88],
            [w * 0.45, h * 0.88],
          ],
          speed: 0.0028,
          delay: 0.7,
        },
        {
          color: "rgba(141, 107, 255, 0.14)",
          nodeColor: "#00f0ff",
          pulseColor: "#c084fc",
          points: [
            [w * 0.55, h - 12],
            [w * 0.78, h - 12],
            [w * 0.86, h - 24],
            [w * 0.95, h - 24],
          ],
          speed: 0.0032,
          delay: 0.5,
        },
      ];
    }

    let progress = [0, 0.35, 0.7, 0.5];

    function getPointOnPolyline(points: number[][], t: number) {
      if (points.length < 2) return points[0] || [0, 0];
      const segments: { len: number; p0: number[]; p1: number[] }[] = [];
      let totalLen = 0;
      for (let i = 0; i < points.length - 1; i += 1) {
        const dx = points[i + 1][0] - points[i][0];
        const dy = points[i + 1][1] - points[i][1];
        const len = Math.sqrt(dx * dx + dy * dy);
        segments.push({ len, p0: points[i], p1: points[i + 1] });
        totalLen += len;
      }
      const targetDist = ((t % 1) + 1) % 1 * totalLen;
      let currentDist = 0;
      for (const seg of segments) {
        if (currentDist + seg.len >= targetDist) {
          const segT = seg.len > 0 ? (targetDist - currentDist) / seg.len : 0;
          return [
            seg.p0[0] + (seg.p1[0] - seg.p0[0]) * segT,
            seg.p0[1] + (seg.p1[1] - seg.p0[1]) * segT,
          ];
        }
        currentDist += seg.len;
      }
      return points[points.length - 1];
    }

    let time = 0;

    function render() {
      if (!ctx || !canvas) return;
      time += 0.02;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // 1. Mechanical Corner Brackets
      const bracketLen = 14;
      ctx.strokeStyle = "rgba(0, 240, 255, 0.28)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Top-Right bracket
      ctx.moveTo(width - bracketLen, 6);
      ctx.lineTo(width - 6, 6);
      ctx.lineTo(width - 6, bracketLen);
      // Bottom-Left bracket
      ctx.moveTo(6, height - bracketLen);
      ctx.lineTo(6, height - 6);
      ctx.lineTo(bracketLen, height - 6);
      ctx.stroke();

      // 2. Micro PCB Circuit Lines and Pulses
      const circuits = getCircuits(width, height);

      circuits.forEach((c, idx) => {
        // Draw static circuit line
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        c.points.forEach(([px, py], pIdx) => {
          if (pIdx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        // Draw nodes at each vertex
        c.points.slice(1).forEach(([px, py], pIdx) => {
          const isEnd = pIdx === c.points.length - 2;
          const nodePulse = 0.5 + Math.sin(time * 2 + idx + pIdx) * 0.3;
          ctx.fillStyle = isEnd ? c.nodeColor : c.pulseColor;
          ctx.globalAlpha = isEnd ? 0.7 + nodePulse * 0.3 : 0.35 + nodePulse * 0.2;
          ctx.beginPath();
          ctx.arc(px, py, isEnd ? 2.4 : 1.6, 0, Math.PI * 2);
          ctx.fill();
        });

        // Advance and draw pulse packet follower
        progress[idx] = (progress[idx] + c.speed) % 1;
        const [pulseX, pulseY] = getPointOnPolyline(c.points, progress[idx]);

        ctx.globalAlpha = 0.95;
        ctx.fillStyle = c.pulseColor;
        ctx.shadowBlur = 6;
        ctx.shadowColor = c.pulseColor;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      ctx.restore();
      animId = requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas className={`console-phaser-bg-canvas ${className}`} ref={canvasRef} aria-hidden="true" />;
});
