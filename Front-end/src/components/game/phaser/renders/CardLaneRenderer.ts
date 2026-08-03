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
  graphics.lineTo(iLeft, iTop + innerRadius);
  graphics.arc(iLeft + innerRadius, iTop + innerRadius, innerRadius, Math.PI, (3 * Math.PI) / 2, false);
  graphics.closePath();
  graphics.strokePath();
  graphics.lineStyle(1.2, color, 0.42 * alpha);
  graphics.lineBetween(x - width * 0.18, bottom - 5, x + width * 0.18, bottom - 5);
}
