import type { ArenaSlotPosition } from "../types/arenaTypes";

export interface ArenaLayout {
  cardWidth: number;
  cardHeight: number;
  topY: number;
  bottomY: number;
  centerY: number;
  topInset: number;
  bottomInset: number;
}

export function getArenaLayout(width: number, height: number, zoom: number, tilt: number): ArenaLayout {
  const cardWidth = Math.max(96, Math.min(128, width * 0.078)) * zoom;
  return {
    cardWidth,
    cardHeight: cardWidth * 1.38,
    topInset: width * 0.11,
    bottomInset: width * 0.045,
    topY: height * 0.055 + height * Math.max(0.08, tilt) * 0.23,
    bottomY: height * 0.945 - height * Math.max(0.08, tilt) * 0.23,
    centerY: height * 0.5,
  };
}

export function getSlotPosition(index: number, y: number, width: number, scale: number): ArenaSlotPosition {
  const left = width * 0.17;
  const right = width * 0.83;
  const x = left + (right - left) * (index / 5);
  return { x: x + (index - 2.5) * (scale === 1 ? 4 : 2), y };
}
