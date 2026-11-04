import type Phaser from "phaser";

/**
 * Returns a cleared 2D canvas texture of the requested size, creating (or
 * recreating) it when needed. Phaser runs in CANVAS mode here, so layers that
 * need gradients and glow are painted with the 2D API into a texture.
 *
 * `density` is how many texture pixels there are per logical pixel: the texture is that much larger and
 * the context is already scaled by it, so the caller still paints in logical pixels (and shows the image
 * at the logical size). Shadow blurs do not follow the scale, so the caller multiplies them by `density`.
 */
export function acquireCanvasTexture(scene: Phaser.Scene, key: string, width: number, height: number, density = 1) {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  const pw = Math.max(1, Math.round(w * density));
  const ph = Math.max(1, Math.round(h * density));
  const textures = scene.textures;
  if (textures.exists(key)) {
    const existing = textures.get(key) as Phaser.Textures.CanvasTexture;
    if (existing.width === pw && existing.height === ph) {
      const ctx = existing.context;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, pw, ph);
      ctx.setTransform(density, 0, 0, density, 0, 0);
      return { texture: existing, ctx, recreated: false, density, width: w, height: h };
    }
    textures.remove(key);
  }
  const texture = textures.createCanvas(key, pw, ph) as Phaser.Textures.CanvasTexture;
  texture.context.setTransform(density, 0, 0, density, 0, 0);
  return { texture, ctx: texture.context, recreated: true, density, width: w, height: h };
}
