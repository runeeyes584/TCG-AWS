import Phaser from "phaser";
import type { ArenaLayout } from "../config/arenaLayout";

export class ArenaBoardRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  render(graphics: Phaser.GameObjects.Graphics, width: number, height: number, layout: ArenaLayout) {
    const { topInset, bottomInset, topY, bottomY, centerY } = layout;
    const topLeft = { x: topInset, y: topY };
    const topRight = { x: width - topInset, y: topY };
    const bottomRight = { x: width - bottomInset, y: bottomY };
    const bottomLeft = { x: bottomInset, y: bottomY };
    const board = graphics.clear();

    // Translucent trapezoid board area so background leylines/fog show through
    board.fillStyle(0x050e1c, 0.55);
    board.fillTriangle(topLeft.x, topLeft.y, topRight.x, topRight.y, bottomRight.x, bottomRight.y);
    board.fillTriangle(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y);
    // Board border lines
    board.lineStyle(1.2, 0x1f9ee6, 0.28);
    board.lineBetween(topLeft.x, topLeft.y, topRight.x, topRight.y);
    board.lineBetween(topRight.x, topRight.y, bottomRight.x, bottomRight.y);
    board.lineBetween(bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y);
    board.lineBetween(bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y);
    // Center divider
    board.lineStyle(1, 0x4bc9df, 0.14).lineBetween(bottomInset, centerY, width - bottomInset, centerY);
    board.lineStyle(2, 0xa855f7, 0.5).lineBetween(width * 0.33, centerY, width * 0.67, centerY);
  }
}

