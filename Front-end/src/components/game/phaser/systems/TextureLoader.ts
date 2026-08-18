import Phaser from "phaser";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import type { UnitInstance } from "@backend/game/types";

export class TextureLoader {
  private readonly requested = new Set<string>();
  private readonly failed = new Set<string>();
  private disposed = false;

  constructor(private readonly scene: Phaser.Scene, private readonly onLoaded: () => void) {}

  request(key: string, imageUrl: string) {
    if (this.disposed || this.scene.textures.exists(key) || this.requested.has(key) || this.failed.has(key)) return;
    this.requested.add(key);
    const image = new Image();
    image.onload = () => {
      if (this.disposed || !this.scene?.sys?.isActive() || !this.scene?.textures) return;
      // WebGL rejects a tainted image during texImage2D. The image must have
      // been created with CORS enabled before src is assigned, otherwise an
      // apparently successful load can still crash Phaser during upload.
      try {
        if (!this.scene.textures.exists(key)) this.scene.textures.addImage(key, image);
        this.onLoaded();
      } catch (error) {
        this.failed.add(key);
        console.warn(`[TextureLoader] Skipping non-CORS image: ${imageUrl}`, error);
      }
    };
    image.onerror = () => {
      this.failed.add(key);
      // CardRenderer deliberately supplies a local visual fallback when no
      // texture is available, so a remote CDN failure must not break the game.
      console.warn(`[TextureLoader] Card artwork could not be loaded: ${imageUrl}`);
    };
    // Anonymous CORS is required by WebGL, but it causes non-CORS card CDNs
    // to reject the image entirely. The active board uses Canvas so remote
    // artwork remains renderable; keep this safe if a WebGL renderer is ever
    // enabled again.
    if (this.scene.game.renderer.type === Phaser.WEBGL) {
      image.crossOrigin = "anonymous";
    }
    image.src = imageUrl;
  }

  destroy() {
    this.disposed = true;
    this.requested.clear();
    this.failed.clear();
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
