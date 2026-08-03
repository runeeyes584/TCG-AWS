import Phaser from "phaser";
import type { GamePhase, PlayerId } from "@backend/game/types";
import type { ArenaLayout } from "../config/arenaLayout";

type Point = { x: number; y: number };

/** Turn-priority feedback layer, rendered between the board and its slots. */
export class BoardEffectsRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly dimGraphics: Phaser.GameObjects.Graphics;
  private readonly scanner: Phaser.GameObjects.Arc;
  private pulseTween?: Phaser.Tweens.Tween;
  private scanTween?: Phaser.Tweens.Tween;
  private signature = "";
  private points: Point[] = [];
  private color = 0x2dd4bf;
  private progress = 0;

  constructor(private readonly scene: Phaser.Scene) {
    this.dimGraphics = scene.add.graphics().setDepth(0.75);
    this.graphics = scene.add.graphics().setDepth(0.5);
    this.scanner = scene.add.circle(0, 0, 3, this.color, 0.9).setDepth(0.55).setVisible(false);
  }

  update(width: number, height: number, layout: ArenaLayout, priorityPlayerId?: PlayerId, viewerPlayerId?: PlayerId, phase?: GamePhase) {
    const active = Boolean(priorityPlayerId && viewerPlayerId);
    const key = active ? `${width}:${height}:${priorityPlayerId}:${viewerPlayerId}:${phase}` : "off";
    if (key === this.signature) return;
    this.signature = key;
    this.stopTweens();
    this.graphics.clear();
    this.dimGraphics.clear();
    this.scanner.setVisible(active);
    if (!active || !priorityPlayerId || !viewerPlayerId) return;

    const localTurn = priorityPlayerId === viewerPlayerId;
    const top = localTurn ? height * 0.49 : height * 0.05;
    const bottom = localTurn ? height * 0.95 : height * 0.51;
    const inactiveTop = localTurn ? 0 : height * 0.51;
    const inactiveBottom = localTurn ? height * 0.49 : height;
    this.dimGraphics.fillStyle(0x01030a, 0.3).fillRect(0, inactiveTop, width, inactiveBottom - inactiveTop);
    const topInset = layout.topInset + (layout.bottomInset - layout.topInset) * Math.max(0, Math.min(1, (top - layout.topY) / (layout.bottomY - layout.topY)));
    const bottomInset = layout.topInset + (layout.bottomInset - layout.topInset) * Math.max(0, Math.min(1, (bottom - layout.topY) / (layout.bottomY - layout.topY)));
    this.points = [
      { x: topInset + 10, y: top + 10 },
      { x: width - topInset - 10, y: top + 10 },
      { x: width - bottomInset - 10, y: bottom - 10 },
      { x: bottomInset + 10, y: bottom - 10 },
    ];
    this.color = priorityPlayerId === "P1" ? 0x2dd4bf : 0x9b8cff;
    this.scanner.setFillStyle(this.color, 0.92);
    this.draw();
    this.pulseTween = this.scene.tweens.add({
      targets: this.graphics,
      alpha: 0.45,
      duration: 900,
      ease: "Sine.InOut",
      yoyo: true,
      repeat: -1,
    });
    this.scanTween = this.scene.tweens.add({
      targets: this,
      progress: 1,
      duration: 3600,
      ease: "Linear",
      repeat: -1,
      onUpdate: () => this.draw(),
    });
  }

  private draw() {
    if (this.points.length < 4) return;
    this.graphics.clear();
    this.graphics.lineStyle(8, this.color, 0.045);
    this.strokeClosed(this.graphics, this.points);
    this.graphics.lineStyle(2, this.color, 0.24);
    this.strokeClosed(this.graphics, this.points);
    this.graphics.lineStyle(1, 0xe5ffff, 0.42);
    this.strokeClosed(this.graphics, this.points.map((point) => ({ x: point.x + 4, y: point.y + 4 })));
    const point = this.pointOnPerimeter(this.progress);
    this.scanner.setPosition(point.x, point.y);
  }

  private strokeClosed(graphics: Phaser.GameObjects.Graphics, points: Point[]) {
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => graphics.lineTo(point.x, point.y));
    graphics.closePath();
    graphics.strokePath();
  }

  private pointOnPerimeter(progress: number): Point {
    const lengths = this.points.map((point, index) => {
      const next = this.points[(index + 1) % this.points.length];
      return Math.hypot(next.x - point.x, next.y - point.y);
    });
    const total = lengths.reduce((sum, length) => sum + length, 0);
    let distance = ((progress % 1) + 1) % 1 * total;
    for (let index = 0; index < lengths.length; index += 1) {
      if (distance <= lengths[index]) {
        const start = this.points[index];
        const end = this.points[(index + 1) % this.points.length];
        const ratio = lengths[index] === 0 ? 0 : distance / lengths[index];
        return { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio };
      }
      distance -= lengths[index];
    }
    return this.points[0];
  }

  private stopTweens() {
    this.pulseTween?.stop();
    this.scanTween?.stop();
    this.pulseTween = undefined;
    this.scanTween = undefined;
    this.progress = 0;
  }

  destroy() {
    this.stopTweens();
    this.graphics.destroy();
    this.dimGraphics.destroy();
    this.scanner.destroy();
  }
}
