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

    board.fillStyle(0x020a18, 0.98).fillRect(0, 0, width, height);
    board.fillStyle(0x071d34, 0.94);
    board.fillTriangle(topLeft.x, topLeft.y, topRight.x, topRight.y, bottomRight.x, bottomRight.y);
    board.fillTriangle(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y);
    board.lineStyle(1.2, 0x1f9ee6, 0.38);
    board.lineBetween(topLeft.x, topLeft.y, topRight.x, topRight.y);
    board.lineBetween(topRight.x, topRight.y, bottomRight.x, bottomRight.y);
    board.lineBetween(bottomRight.x, bottomRight.y, bottomLeft.x, bottomLeft.y);
    board.lineBetween(bottomLeft.x, bottomLeft.y, topLeft.x, topLeft.y);
    board.lineStyle(1, 0x4bc9df, 0.2).lineBetween(bottomInset, centerY, width - bottomInset, centerY);
    board.lineStyle(2, 0xa855f7, 0.64).lineBetween(width * 0.33, centerY, width * 0.67, centerY);

    for (let i = 0; i < 18; i += 1) {
      const x = width * (0.12 + ((i * 0.137) % 0.76));
      const y = height * (0.09 + ((i * 0.193) % 0.82));
      board.fillStyle(i % 2 ? 0x49d9ff : 0xa986ff, 0.16).fillCircle(x, y, i % 3 === 0 ? 2 : 1);
    }
  }
}
