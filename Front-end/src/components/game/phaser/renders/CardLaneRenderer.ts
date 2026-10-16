import type Phaser from "phaser";
import type { Point, Quad, SlotGeometry } from "../config/arenaProjection";
import { ARENA_HEX } from "../config/arenaTheme";

/** Highlight for a socket that can receive a card (hover on an empty slot). */
export function drawValidSlot(graphics: Phaser.GameObjects.Graphics, slot: SlotGeometry, pulse: number) {
  const [a, b, c, d] = slot.quad;
  const fill = (alpha: number, grow: number) => {
    const cx = (a.x + b.x + c.x + d.x) / 4;
    const cy = (a.y + b.y + c.y + d.y) / 4;
    const p = (pt: Point) => ({ x: cx + (pt.x - cx) * grow, y: cy + (pt.y - cy) * grow });
    const [pa, pb, pc, pd] = [p(a), p(b), p(c), p(d)];
    graphics.fillStyle(ARENA_HEX.violetBright, alpha);
    graphics.beginPath();
    graphics.moveTo(pa.x, pa.y);
    graphics.lineTo(pb.x, pb.y);
    graphics.lineTo(pc.x, pc.y);
    graphics.lineTo(pd.x, pd.y);
    graphics.closePath();
    graphics.fillPath();
  };
  fill(0.07 + pulse * 0.05, 1.22);
  fill(0.12 + pulse * 0.06, 1.1);
  fill(0.2 + pulse * 0.1, 1);

  // Light beam: a few stacked trapezoids fade upward from the socket.
  const height = slot.width * 1.5;
  for (let i = 0; i < 6; i += 1) {
    const t0 = i / 6;
    const t1 = (i + 1) / 6;
    const inset = slot.width * 0.16;
    const x0 = (v: number, edge: "l" | "r") => (edge === "l" ? slot.center.x - slot.width * 0.42 + inset * v : slot.center.x + slot.width * 0.42 - inset * v);
    graphics.fillStyle(ARENA_HEX.violetGlow, (0.2 + pulse * 0.08) * (1 - t0) * 0.7);
    graphics.beginPath();
    graphics.moveTo(x0(t0, "l"), slot.center.y - height * t0);
    graphics.lineTo(x0(t0, "r"), slot.center.y - height * t0);
    graphics.lineTo(x0(t1, "r"), slot.center.y - height * t1);
    graphics.lineTo(x0(t1, "l"), slot.center.y - height * t1);
    graphics.closePath();
    graphics.fillPath();
  }

  graphics.lineStyle(2, ARENA_HEX.violetGlow, 0.85 + pulse * 0.15);
  graphics.beginPath();
  graphics.moveTo(a.x, a.y);
  graphics.lineTo(b.x, b.y);
  graphics.lineTo(c.x, c.y);
  graphics.lineTo(d.x, d.y);
  graphics.closePath();
  graphics.strokePath();
  graphics.lineStyle(1.5, ARENA_HEX.violetGlow, 0.7);
  graphics.strokeEllipse(slot.center.x, slot.center.y, slot.width * (0.72 + pulse * 0.06), slot.width * 0.2);
}

/**
 * Traces a dashed path along a list of connected polygon vertices.
 * Offset parameter drives smooth marching-ants dash animation.
 */
function drawDashedPolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: Point[],
  dashLength: number,
  gapLength: number,
  dashOffset: number,
) {
  if (points.length < 2) return;

  const segments: { start: Point; end: Point; length: number }[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const start = points[i];
    const end = points[(i + 1) % points.length];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length > 0) {
      segments.push({ start, end, length });
    }
  }

  const patternLength = dashLength + gapLength;
  let patternProgress = dashOffset % patternLength;
  if (patternProgress < 0) patternProgress += patternLength;

  graphics.beginPath();
  let firstMove = true;

  for (const seg of segments) {
    let segRemaining = seg.length;
    let cx = seg.start.x;
    let cy = seg.start.y;
    const ux = (seg.end.x - seg.start.x) / seg.length;
    const uy = (seg.end.y - seg.start.y) / seg.length;

    while (segRemaining > 0) {
      const stateRemaining =
        patternProgress < dashLength
          ? dashLength - patternProgress
          : patternLength - patternProgress;

      const step = Math.min(segRemaining, stateRemaining);
      const nx = cx + ux * step;
      const ny = cy + uy * step;

      if (patternProgress < dashLength) {
        if (firstMove) {
          graphics.moveTo(cx, cy);
          firstMove = false;
        } else {
          graphics.lineTo(cx, cy);
        }
        graphics.lineTo(nx, ny);
      } else {
        firstMove = true;
      }

      cx = nx;
      cy = ny;
      segRemaining -= step;
      patternProgress = (patternProgress + step) % patternLength;
    }
  }

  graphics.strokePath();
}

/**
 * Defender lane warning used during the block phase: an animated dashed outline
 * around the projected socket (amber, so it reads apart from violet/blood).
 */
export function drawDefendSlot(
  graphics: Phaser.GameObjects.Graphics,
  quad: Quad,
  breathAlpha: number,
  perspectiveScale: number,
) {
  const alpha = Math.min(Math.max(breathAlpha, 0), 1);
  const scale = Math.min(Math.max(perspectiveScale, 0.6), 1.2);
  const amber = 0xfbbf24;
  const orange = 0xff6b35;
  const brightYellow = 0xfff59d;

  const cx = (quad[0].x + quad[1].x + quad[2].x + quad[3].x) / 4;
  const cy = (quad[0].y + quad[1].y + quad[2].y + quad[3].y) / 4;
  const points = quad.map((pt) => ({ x: cx + (pt.x - cx) * 1.12, y: cy + (pt.y - cy) * 1.12 }));

  const rawOffset = Number(graphics.getData("dashOffset") ?? 0);
  const dash = Math.max(10, 14 * scale);
  const gap = Math.max(6, 8 * scale);
  const dashOffset = rawOffset * (dash + gap);

  graphics.lineStyle(8.5 * scale, orange, 0.12 + alpha * 0.28);
  drawDashedPolygon(graphics, points, dash, gap, dashOffset);
  graphics.lineStyle(3.8 * scale, amber, 0.45 + alpha * 0.55);
  drawDashedPolygon(graphics, points, dash, gap, dashOffset);
  graphics.lineStyle(1.8 * scale, brightYellow, 0.6 + alpha * 0.4);
  drawDashedPolygon(graphics, points, dash, gap, dashOffset);
}
