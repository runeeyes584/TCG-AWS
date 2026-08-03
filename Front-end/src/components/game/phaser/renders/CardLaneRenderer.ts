import Phaser from "phaser";

export function drawCardLane(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  color: number,
  alpha: number,
) {
  const radius = Math.min(14, width * 0.12);
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - height / 2;
  const bottom = y + height / 2;

  // Recessed card-shaped socket: the dark core keeps a placed card visually
  // distinct while the coloured edge carries the player/team identity.
  graphics.fillStyle(0x020914, 0.46 * alpha);
  graphics.beginPath();
  graphics.moveTo(left + radius, top);
  graphics.lineTo(right, top);
  graphics.lineTo(right, bottom - radius);
  graphics.arc(right - radius, bottom - radius, radius, 0, Math.PI / 2, false);
  graphics.lineTo(left, bottom);
  graphics.lineTo(left, top + radius);
  graphics.arc(left + radius, top + radius, radius, Math.PI, (3 * Math.PI) / 2, false);
  graphics.closePath();
  graphics.fillPath();

  graphics.lineStyle(2.2, color, 0.1 * alpha);
  graphics.strokePath();
  graphics.lineStyle(1.25, color, 0.62 * alpha);
  graphics.strokePath();

  // Inner trim and a short, ritual-like bottom accent make the slot read as a
  // physical card seat without competing with a placed card.
  const innerRadius = Math.max(4, radius - 4);
  const iLeft = left + 4;
  const iRight = right - 4;
  const iTop = top + 4;
  const iBottom = bottom - 4;

  graphics.lineStyle(1, color, 0.12 * alpha);
  graphics.beginPath();
  graphics.moveTo(iLeft + innerRadius, iTop);
  graphics.lineTo(iRight, iTop);
  graphics.lineTo(iRight, iBottom - innerRadius);
  graphics.arc(iRight - innerRadius, iBottom - innerRadius, innerRadius, 0, Math.PI / 2, false);
  graphics.lineTo(iLeft, iBottom);
  graphics.lineTo(iLeft, top + innerRadius);
  graphics.arc(iLeft + innerRadius, top + innerRadius, innerRadius, Math.PI, (3 * Math.PI) / 2, false);
  graphics.closePath();
  graphics.strokePath();
  graphics.lineStyle(1.2, color, 0.42 * alpha);
  graphics.lineBetween(x - width * 0.18, bottom - 5, x + width * 0.18, bottom - 5);
}

type Point = { x: number; y: number };

/**
 * Generates perimeter points for the CardLane socket path:
 * 2 rounded corners (Top-Left & Bottom-Right) and 2 sharp corners (Top-Right & Bottom-Left).
 */
function getCardLanePathPoints(
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number,
  arcSegments = 8,
): Point[] {
  const points: Point[] = [];

  // Top edge: (left + radius, top) -> (right, top)
  points.push({ x: left + radius, y: top });
  points.push({ x: right, y: top });

  // Right edge: (right, top) -> (right, bottom - radius)
  points.push({ x: right, y: bottom - radius });

  // Bottom-right arc: center (right - radius, bottom - radius), from 0 to PI/2
  const brCenterX = right - radius;
  const brCenterY = bottom - radius;
  for (let i = 1; i <= arcSegments; i += 1) {
    const angle = (i / arcSegments) * (Math.PI / 2);
    points.push({
      x: brCenterX + radius * Math.cos(angle),
      y: brCenterY + radius * Math.sin(angle),
    });
  }

  // Bottom edge: (right - radius, bottom) -> (left, bottom)
  points.push({ x: left, y: bottom });

  // Left edge: (left, bottom) -> (left, top + radius)
  points.push({ x: left, y: top + radius });

  // Top-left arc: center (left + radius, top + radius), from PI to 3*PI/2
  const tlCenterX = left + radius;
  const tlCenterY = top + radius;
  for (let i = 1; i <= arcSegments; i += 1) {
    const angle = Math.PI + (i / arcSegments) * (Math.PI / 2);
    points.push({
      x: tlCenterX + radius * Math.cos(angle),
      y: tlCenterY + radius * Math.sin(angle),
    });
  }

  return points;
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
 * Defender lane warning highlight used during declare_block phase.
 * Features a thick, animated dashed outline around the exact 2-corner CardLane shape with no fill.
 */
export function drawDefendCardLane(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  breathAlpha: number,
  perspectiveScale: number,
) {
  const alpha = Phaser.Math.Clamp(breathAlpha, 0, 1);
  const scale = Phaser.Math.Clamp(perspectiveScale, 0.7, 1.2);
  const radius = Math.min(14, width * 0.12);
  const left = x - width / 2;
  const right = x + width / 2;
  const top = y - height / 2;
  const bottom = y + height / 2;

  // Warning colors: high-visibility warning amber & orange
  const amber = 0xfbbf24;
  const orange = 0xff6b35;
  const brightYellow = 0xfff59d;

  // Extract dash animation progress (0 -> 1) from graphics object data
  const rawOffset = Number(graphics.getData("dashOffset") ?? 0);
  const dash = Math.max(10, 14 * scale);
  const gap = Math.max(6, 8 * scale);
  const patternLength = dash + gap;
  const dashOffset = rawOffset * patternLength;

  const points = getCardLanePathPoints(left, top, right, bottom, radius);

  // 1. Soft outer warning under-glow (thick stroke)
  graphics.lineStyle(8.5 * scale, orange, 0.12 + alpha * 0.28);
  drawDashedPolygon(graphics, points, dash, gap, dashOffset);

  // 2. Primary thick warning dashed border
  graphics.lineStyle(3.8 * scale, amber, 0.45 + alpha * 0.55);
  drawDashedPolygon(graphics, points, dash, gap, dashOffset);

  // 3. Crisp inner bright core dash line
  graphics.lineStyle(1.8 * scale, brightYellow, 0.6 + alpha * 0.4);
  drawDashedPolygon(graphics, points, dash, gap, dashOffset);
}
