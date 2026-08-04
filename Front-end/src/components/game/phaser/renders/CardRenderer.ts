import Phaser from "phaser";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GiHeartShield, GiBroadsword, GiLightningStorm } from "react-icons/gi";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { getUnitAttack, getUnitHealth } from "@backend/game/entities/cards";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import type { UnitView } from "../types/arenaTypes";
import { TextureLoader } from "../systems/TextureLoader";
import { CardInteractionSystem } from "../systems/CardInteractionSystem";
import { CardAnimationManager } from "../systems/CardAnimationManager";
import type { SpellEffectKind } from "../../visualEffectSemantics";

export class CardRenderer {
  private readonly views = new Map<string, UnitView>();
  private readonly textures: TextureLoader;
  private readonly animations: CardAnimationManager;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onTextureLoaded: () => void,
    private readonly interactions = new CardInteractionSystem(scene)
  ) {
    this.animations = new CardAnimationManager(scene);
    this.textures = new TextureLoader(scene, onTextureLoaded);
    this.textures.request("arena-card-front", "/monster/card-front.png");

    // Preload gaming icons from react-icons/gi
    // Phaser runs in CANVAS mode so runtime image tinting is not reliable.
    // Bake the same soft icon colours used by StatPip into each SVG texture.
    this.preloadReactIcon("icon-hp", GiHeartShield, 128, "#86efac");
    this.preloadReactIcon("icon-atk", GiBroadsword, 128, "#fca5a5");
    this.preloadReactIcon("icon-mana", GiLightningStorm, 128, "#7dd3fc");
  }

  private preloadReactIcon(
    key: string,
    IconComponent: React.ComponentType<{ size?: string | number; color?: string }>,
    size: number,
    color: string
  ) {
    if (this.scene.textures.exists(key)) return;

    try {
      const element = React.createElement(IconComponent, { size, color });
      const svgText = renderToStaticMarkup(element);

      const img = new Image();
      img.onload = () => {
        if (!this.scene.textures.exists(key)) {
          this.scene.textures.addImage(key, img);
          this.onTextureLoaded();
        }
      };
      img.src = "data:image/svg+xml;utf8," + encodeURIComponent(svgText);
    } catch (e) {
      console.error("Failed to preload react-icon texture:", key, e);
    }
  }

  clear() {
    this.animations.clear();
    this.views.forEach((view) => view.destroy());
    this.views.clear();
  }

  destroy() {
    this.clear();
    this.textures.destroy();
  }

  get(unitId: string) {
    return this.views.get(unitId);
  }

  playEffect(unitId: string, kind: SpellEffectKind) {
    const view = this.views.get(unitId);
    if (view) this.animations.playEffect(view, kind);
  }

  private getTitleFontSize(name: string, width: number) {
    const base = Math.min(12, Math.max(8, Math.round(width * 0.105)));
    if (name.length > 24) return Math.max(7, base - 3);
    if (name.length > 17) return Math.max(8, base - 2);
    return base;
  }

  private drawHeart(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    const width = w * 0.95;
    const height = h * 0.95;
    g.beginPath();
    g.moveTo(x, y + height * 0.45);
    g.lineTo(x - width * 0.48, y - height * 0.08);
    g.lineTo(x - width * 0.42, y - height * 0.32);
    g.lineTo(x - width * 0.22, y - height * 0.46);
    g.lineTo(x - width * 0.08, y - height * 0.38);
    g.lineTo(x, y - height * 0.22);
    g.lineTo(x + width * 0.08, y - height * 0.38);
    g.lineTo(x + width * 0.22, y - height * 0.46);
    g.lineTo(x + width * 0.42, y - height * 0.32);
    g.lineTo(x + width * 0.48, y - height * 0.08);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private drawSword(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    const width = w * 0.9;
    const height = h * 0.95;
    g.beginPath();
    g.moveTo(x, y - height * 0.48);
    g.lineTo(x - width * 0.28, y - height * 0.22);
    g.lineTo(x - width * 0.24, y + height * 0.08);
    g.lineTo(x - width * 0.42, y + height * 0.08);
    g.lineTo(x - width * 0.42, y + height * 0.16);
    g.lineTo(x - width * 0.12, y + height * 0.16);
    g.lineTo(x - width * 0.08, y + height * 0.42);
    g.lineTo(x - width * 0.15, y + height * 0.42);
    g.lineTo(x - width * 0.15, y + height * 0.48);
    g.lineTo(x + width * 0.15, y + height * 0.48);
    g.lineTo(x + width * 0.15, y + height * 0.42);
    g.lineTo(x + width * 0.08, y + height * 0.42);
    g.lineTo(x + width * 0.12, y + height * 0.16);
    g.lineTo(x + width * 0.42, y + height * 0.16);
    g.lineTo(x + width * 0.42, y + height * 0.08);
    g.lineTo(x + width * 0.24, y + height * 0.08);
    g.lineTo(x + width * 0.28, y - height * 0.22);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private drawLightning(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number) {
    g.beginPath();
    g.moveTo(x + w * 0.08, y - h * 0.48);
    g.lineTo(x + w * 0.38, y - h * 0.48);
    g.lineTo(x - w * 0.08, y - h * 0.05);
    g.lineTo(x + w * 0.28, y - h * 0.05);
    g.lineTo(x - w * 0.18, y + h * 0.48);
    g.lineTo(x - w * 0.05, y + h * 0.08);
    g.lineTo(x - w * 0.38, y + h * 0.08);
    g.closePath();
    g.fillPath();
    g.strokePath();
  }

  private createStatBadge(
    x: number,
    y: number,
    width: number,
    height: number,
    type: "ATK" | "HP",
    value: number,
    originalHeight: number
  ) {
    const textureKey = type === "HP" ? "icon-hp" : "icon-atk";
    const tintColor = type === "HP" ? 0x86efac : 0xfca5a5; // Soft pastel green / soft pastel red
    const textColor = type === "HP" ? "#22d389" : "#f14935"; // Bright Tailwind theme colors (var(--hp) / var(--attack))
    
    // Reduce diameter by 3px (reduce radius by 1.5px)
    const plateRadius = height * 0.78 - 1.5;
    const plate = this.scene.add.circle(x, y, plateRadius, 0x050b14, 0.98)
      .setStrokeStyle(2, tintColor, 0.98);

    // Reduce icon size by 3px
    const iconSize = height * 0.9 - 3;

    let badge: Phaser.GameObjects.GameObject;
    if (this.scene.textures.exists(textureKey)) {
      const img = this.scene.add.image(x, y, textureKey);
      img.setDisplaySize(iconSize, iconSize);
      // Do not use setTint here: this scene deliberately uses Phaser.CANVAS,
      // where tint support varies by browser. The texture itself is coloured.
      img.setAlpha(0.82);
      badge = img;
    } else {
      const fallback = this.scene.add.graphics();
      fallback.fillStyle(tintColor, 0.28);
      fallback.lineStyle(1.6, tintColor, 0.95);
      if (type === "HP") this.drawHeart(fallback, x, y, width - 3, height - 3);
      else this.drawSword(fallback, x, y, width - 3, height - 3);
      badge = fallback;
    }

    const textOffsetY = type === "ATK" ? -height * 0.08 : 0;

    const valueText = this.scene.add.text(x, y + textOffsetY, String(value), {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: `${Math.max(13, Math.round(originalHeight * 0.52))}px`,
      fontStyle: "bold",
      color: textColor,
      stroke: "#000000",
      strokeThickness: 3.5,
    }).setOrigin(0.5);

    return [plate, badge, valueText];
  }

  create(unit: UnitInstance, playerId: PlayerId, width: number, height: number, isTargetable = false, targetType?: "ally" | "enemy") {
    const definition = getCardDefinition(unit.cardId);
    const isChampion = definition.type === "champion";
    // Color theme matching game-card.tsx & hand-card.tsx:
    // Gold-Red (0xf59e0b) for Champions, Steel Blue-Grey (0x6495ed) for Units
    const color = isChampion ? 0xf59e0b : 0x6495ed;

    // A dark ritual-card silhouette with a compact header, square artwork,
    // and stat badges anchored to the lower corners.
    const frameGraphics = this.scene.add.graphics();
    const radius = Math.min(12, width * 0.12);
    const left = -width / 2;
    const right = width / 2;
    const top = -height / 2;
    const bottom = height / 2;

    frameGraphics.fillStyle(0x050b14, 0.99);
    frameGraphics.beginPath();
    frameGraphics.moveTo(left + radius, top);
    frameGraphics.lineTo(right, top);
    frameGraphics.lineTo(right, bottom - radius);
    frameGraphics.arc(right - radius, bottom - radius, radius, 0, Math.PI / 2, false);
    frameGraphics.lineTo(left, bottom);
    frameGraphics.lineTo(left, top + radius);
    frameGraphics.arc(left + radius, top + radius, radius, Math.PI, (3 * Math.PI) / 2, false);
    frameGraphics.closePath();
    frameGraphics.fillPath();

    frameGraphics.lineStyle(2.2, color, 0.96);
    frameGraphics.strokePath();

    // The updated PNG has a transparent centre, so it can sit above content as
    // a true frame without hiding artwork, title, or stat badges.
    // Tint the PNG frame overlay to match the card type theme (Steel Blue-Grey or Gold-Red).
    const cardFront = this.scene.textures.exists("arena-card-front")
      ? this.scene.add.image(0, 0, "arena-card-front")
          .setDisplaySize(width, height)
          .setTint(color)
      : undefined;

    const innerRadius = Math.max(2, radius - 3);
    const iLeft = left + 3;
    const iRight = right - 3;
    const iTop = top + 3;
    const iBottom = bottom - 3;
    frameGraphics.lineStyle(1, color, 0.25);
    frameGraphics.beginPath();
    frameGraphics.moveTo(iLeft + innerRadius, iTop);
    frameGraphics.lineTo(iRight, iTop);
    frameGraphics.lineTo(iRight, iBottom - innerRadius);
    frameGraphics.arc(iRight - innerRadius, iBottom - innerRadius, innerRadius, 0, Math.PI / 2, false);
    frameGraphics.lineTo(iLeft, iBottom);
    frameGraphics.lineTo(iLeft, iTop + innerRadius);
    frameGraphics.arc(iLeft + innerRadius, iTop + innerRadius, innerRadius, Math.PI, (3 * Math.PI) / 2, false);
    frameGraphics.closePath();
    frameGraphics.strokePath();

    const headerHeight = Math.max(18, Math.min(27, height * 0.15));
    const headerY = top + headerHeight / 2 + 3;
    const artSize = Math.min(width - 10, height - headerHeight - 12);
    const artY = top + headerHeight + 5 + artSize / 2;
    const artFrame = this.scene.add.rectangle(0, artY, artSize, artSize, 0x020711, 0.95).setStrokeStyle(1, color, 0.62);
    const textureKey = this.textures.getKey(unit);

    let art: Phaser.GameObjects.GameObject;
    if (textureKey) {
      const artImage = this.scene.add.image(0, artY, textureKey);
      // Fit inside the square without stretching or spilling over its frame.
      artImage.setScale(Math.min(artSize / artImage.width, artSize / artImage.height));
      art = artImage;
    } else {
      // Fallback empty graphics or colored box
      art = this.scene.add.rectangle(0, artY, artSize, artSize, color, 0.15).setStrokeStyle(1, color, 0.45);
    }

    // Header nameplate: the title stays inside a clearly defined border and
    // leaves room for the mana badge floating over the top-left corner.
    const banner = this.scene.add.rectangle(0, headerY, width - 8, headerHeight, 0x091321, 0.98).setStrokeStyle(1.2, color, 0.72);
    const nameText = this.scene.add.text(width * 0.06, headerY, definition.name.toUpperCase(), {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: `${this.getTitleFontSize(definition.name, width)}px`,
      fontStyle: "bold",
      color: "#f2f7ff",
      align: "center",
      wordWrap: { width: width - 25, useAdvancedWrap: true },
      lineSpacing: -2,
      stroke: "#02060d",
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Pre-calculate stat height and text size to share with mana text
    const statHeight = Math.max(25, width * 0.26);
    const statTextSize = Math.max(13, Math.round(statHeight * 0.52));

    // Mana badge floats over the top-left border of the header.
    const manaRadius = Math.max(10, Math.round(width * 0.125));
    const manaX = left + manaRadius * 0.55;
    const manaY = top + manaRadius * 0.82;
    const manaSize = manaRadius * 1.35;
    const manaPlate = this.scene.add.circle(manaX, manaY, manaRadius, 0x061522, 0.98)
      .setStrokeStyle(1.7, 0x0ea5e9, 0.98);
    
    let manaBadge: Phaser.GameObjects.GameObject;
    if (this.scene.textures.exists("icon-mana")) {
      const img = this.scene.add.image(manaX, manaY, "icon-mana");
      img.setDisplaySize(manaSize, manaSize);
      // The SVG texture is already pastel blue; this remains visible in both
      // WebGL and Canvas renderers.
      img.setAlpha(0.82);
      manaBadge = img;
    } else {
      const fallback = this.scene.add.graphics();
      fallback.fillStyle(0x0b82c7, 0.28);
      fallback.lineStyle(1.5, 0x0ea5e9, 0.95);
      this.drawLightning(fallback, manaX, manaY, manaSize, manaSize);
      manaBadge = fallback;
    }

    const manaText = this.scene.add.text(manaX, manaY, String(definition.cost), {
      fontFamily: "Inter, Arial, sans-serif",
      fontSize: `${statTextSize}px`,
      fontStyle: "bold",
      color: "#00b4ff",
      stroke: "#000000",
      strokeThickness: 3,
    }).setOrigin(0.5);

    const statY = bottom - statHeight * 0.45;
    const statX = width * 0.06;
    const atkParts = this.createStatBadge(left + statX, statY, statHeight, statHeight, "ATK", getUnitAttack(unit), statHeight);
    const hpParts = this.createStatBadge(right - statX, statY, statHeight, statHeight, "HP", getUnitHealth(unit), statHeight);

    // Assemble Card Components
    const card = this.scene.add.container(0, 0, [
      frameGraphics,
      ...(cardFront ? [cardFront] : []),
      artFrame,
      art,
      banner,
      nameText,
      manaPlate,
      manaBadge,
      manaText,
      ...atkParts,
      ...hpParts,
    ]) as UnitView;

    card.unitId = unit.instanceId;
    card.setSize(width, height);
    this.interactions.bind(card, unit, playerId);
    this.animations.attach(card, isChampion, color, isTargetable, targetType);
    this.views.set(unit.instanceId, card);
    return card;
  }

  playSummon(unitId: string) {
    const view = this.views.get(unitId);
    if (view) {
      view.setAlpha(0).setScale(1.22);
      this.scene.tweens.add({
        targets: view,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: 320,
        ease: "Back.Out"
      });
    }
  }

  playAttack(unitId: string) {
    const view = this.views.get(unitId);
    if (view) {
      const y = view.y;
      this.scene.tweens.add({
        targets: view,
        y: y + (y > this.scene.scale.height / 2 ? -38 : 38),
        yoyo: true,
        duration: 190,
        ease: "Sine.Out"
      });
    }
  }

  playDestroy(unitId: string) {
    const view = this.views.get(unitId);
    if (view) {
      this.scene.tweens.add({
        targets: view,
        alpha: 0,
        scaleX: 1.35,
        scaleY: 0.55,
        duration: 240,
        onComplete: () => view.destroy()
      });
    }
  }
}
