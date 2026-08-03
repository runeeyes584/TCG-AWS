import Phaser from "phaser";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import type { UnitInstance } from "@backend/game/types";

export class TextureLoader {
  private readonly requested = new Set<string>();

  constructor(private readonly scene: Phaser.Scene, private readonly onLoaded: () => void) {}

  request(key: string, imageUrl: string) {
    if (this.scene.textures.exists(key) || this.requested.has(key)) return;
    this.requested.add(key);
    const image = new Image();
    image.onload = () => {
      if (!this.scene.textures.exists(key)) this.scene.textures.addImage(key, image);
      this.onLoaded();
    };
    image.src = imageUrl;
  }

  getKey(unit: UnitInstance) {
    const imageUrl = getCardDefinition(unit.cardId).imageUrl?.trim();
    if (!imageUrl) return undefined;
    const key = `arena-card-${unit.cardId}`;
    if (this.scene.textures.exists(key)) return key;
    if (!this.requested.has(key)) {
      this.request(key, imageUrl);
    }
    return undefined;
  }
}
