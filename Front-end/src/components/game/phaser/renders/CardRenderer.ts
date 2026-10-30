import * as Phaser from "phaser";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GiHeartShield, GiBroadsword } from "react-icons/gi";
import { getCardDefinition } from "@backend/game/entities/cardRegistry";
import { getUnitAttack, getUnitHealth } from "@backend/game/entities/cards";
import type { PlayerId, UnitInstance } from "@backend/game/types";
import type { UnitView } from "../types/arenaTypes";
import { boundsOf, padBounds, type Bounds, type CardPlacement, type Point, type Quad } from "../config/arenaProjection";
import { logicalSize } from "../config/arenaScale";
import { hoverPose, liftedRect } from "../config/hoverLift";
import { GLIDE_MS, SWEEP_MS, glideOffset, isNewlyDeclared, isRetreating, sweepWindow } from "../config/declareMotion";
import { TextureLoader } from "../systems/TextureLoader";
import { CardInteractionSystem } from "../systems/CardInteractionSystem";
import { CardAnimationManager } from "../systems/CardAnimationManager";
import type { SpellEffectKind } from "../../visualEffectSemantics";
import { CARD_THEME, paintBoardFace, type CardFaceKind } from "./cardFace";
import { statTrends, trendKey } from "../../cards/cardStats";
import { speedOf } from "../../cards/spellSpeed";
import { CardSurface, type CardLook } from "./CardSurface";

const FACE_PADDING = 24;
/** The face is painted at this multiple of its on-screen size, then scaled down crisply. */
const FACE_SUPERSAMPLE = 2;
const HOVER_FADE_MS = 120;

/** The colour of the edge of a declared card: blood-red to attack, gold to block (as on the Pass seal). */
export const ROLE_COLOR = { attack: 0xff2e63, defend: 0xe8c26a } as const;
export type CardRole = keyof typeof ROLE_COLOR;

const reducedMotion = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

export interface CardViewOptions {
  /** The player has picked this card to declare next: it stays raised and ringed in violet until it is declared or dropped. */
  picked?: boolean;
  isTargetable?: boolean;
  targetType?: "ally" | "enemy";
  /** The card is part of a combat lane (attacking or blocking). */
  inLane?: boolean;
  /** Whether it attacks or blocks: the colour of its edge. */
  role?: CardRole;
}

/** What a declared card tells the table: where it came from and where it is going (for the trail it leaves). */
export interface DeclareInfo {
  unitId: string;
  from: Point;
  to: Point;
  width: number;
  height: number;
  role: CardRole;
  champion: boolean;
  /** The card is being taken back to the waiting row, not declared: the trail runs the other way, in a plain colour. */
  retreat?: boolean;
}

/** The state of a card that outlives a redraw of the arena, kept per unit. */
interface CardPose {
  /** In a combat lane. */
  base: boolean;
  role?: CardRole;
  /** The player has picked it (a blocker waiting for its lane). */
  picked: boolean;
  /** The pointer is over it. */
  hovered: boolean;
  /** How strongly the pointer lights its edge, 0..1. */
  hover: number;
  /** The role it had in the lane it has just left, while it glides back (its edge fades out). */
  leaving?: CardRole;
  /** 0 = still at the slot it came from (the waiting row), 1 = arrived at its slot in the lane. */
  glide: number;
  /** Where the card came from, while it glides. */
  glideFrom?: Point;
  /** A one-shot jolt (a hit, a lunge) added to the card's place, so it never fights the glide; at rest it is 0. */
  nudge: Point;
  /** How far the light has run round its edge, 0..1 (1 = done), and how many laps it makes. */
  sweep: number;
  sweepLaps: number;
  hoverTween?: Phaser.Tweens.Tween;
  glideTween?: Phaser.Tweens.Tween;
  sweepTween?: Phaser.Tweens.Tween;
  nudgeTween?: Phaser.Tweens.Tween;
}

/** A short jolt of a card along one axis: it goes `from` to `to` (yoyo comes back) and always ends at rest. */
export interface Jolt {
  axis: "x" | "y";
  from?: number;
  to: number;
  duration: number;
  ease?: string;
  yoyo?: boolean;
  repeat?: number;
}

interface CardView {
  card: UnitView;
  /** The card's picture: the part that rises and grows under the pointer (the container and its hit area stay put). */
  image: Phaser.GameObjects.Image;
  /** Where `image` lies in the container and how large it is shown when the card is at rest. */
  rest: { x: number; y: number; scaleX: number; scaleY: number };
  surface: CardSurface;
  /** The card's face painted for the proportions of `quad`, so it is never stretched. */
  renderFace: (quad: Quad) => HTMLCanvasElement;
  placement: CardPlacement;
  /** The flat footprint's bounding box: the container is centred on it. */
  box: Bounds;
  pose: CardPose;
}

interface CardFace {
  signature: string;
  canvas: HTMLCanvasElement;
}

/**
 * Units on the board lie flat in their lane at the lane's full size, and stay flat. Each card face is
 * painted into an offscreen canvas and then laid into the lane's quad. A card that is declared into a
 * combat lane glides there from its slot in the waiting row, a light runs once round its edge, and the
 * edge stays lit: blood-red for an attacker, gold for a blocker. The pointer lights the edge too.
 * Everything that marks a card is painted into its own texture, so nothing can fall behind or in
 * front of the wrong thing. As a card moves its face is painted again for the proportions of the
 * current quad, so it stays sharp and is never stretched.
 */
export class CardRenderer {
  private readonly views = new Map<string, CardView>();
  private readonly faces = new Map<string, CardFace>();
  private readonly poses = new Map<string, CardPose>();
  /** Where each card lay when it was last drawn: a card that is declared glides from there to its lane. */
  private readonly centers = new Map<string, Point>();
  private readonly textures: TextureLoader;
  private readonly animations: CardAnimationManager;
  private fontEpoch = 0;
  /** Called once when a card is declared into a lane (the table draws the trail it leaves). */
  onDeclare?: (info: DeclareInfo) => void;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly onTextureLoaded: () => void,
    private readonly interactions = new CardInteractionSystem(),
  ) {
    this.animations = new CardAnimationManager(scene);
    this.textures = new TextureLoader(scene, onTextureLoaded);
    this.textures.request("arena-card-front", "/monster/card-front.png");

    // Phaser runs in CANVAS mode, so icons are baked in their final colours.
    this.preloadReactIcon("icon-hp", GiHeartShield, 128, "#86efac");
    this.preloadReactIcon("icon-atk", GiBroadsword, 128, "#fca5a5");

    // Repaint once the web fonts are available (the first paint may use fallbacks).
    void document.fonts?.ready.then(() => {
      this.fontEpoch += 1;
      if (this.scene?.sys?.isActive()) this.onTextureLoaded();
    });
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
        if (!this.scene?.sys?.isActive() || !this.scene?.textures) return;
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

  /** Takes every card off the table before a redraw; the hovered unit is carried over to its new card. */
  clear() {
    this.interactions.beginRedraw();
    this.animations.clear();
    this.views.forEach((view) => {
      this.stopTweens(view.pose);
      view.card.destroy();
    });
    this.views.clear();
  }

  private stopTweens(pose: CardPose) {
    [pose.hoverTween, pose.glideTween, pose.sweepTween, pose.nudgeTween].forEach((tween) => tween?.stop());
    pose.hoverTween = undefined;
    pose.glideTween = undefined;
    pose.sweepTween = undefined;
    pose.nudgeTween = undefined;
    // A jolt cut short by a redraw ends at rest; the card is drawn again from its place.
    pose.nudge = { x: 0, y: 0 };
  }

  /** Drops the face, texture and pose of units that are no longer on the board. */
  prune(activeUnitIds: Set<string>) {
    Array.from(this.faces.keys()).forEach((unitId) => {
      if (activeUnitIds.has(unitId)) return;
      this.faces.delete(unitId);
      const pose = this.poses.get(unitId);
      if (pose) this.stopTweens(pose);
      this.poses.delete(unitId);
      this.centers.delete(unitId);
      const key = this.faceKey(unitId);
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    });
  }

  /** The redraw is over: ends a hover that no new card took back (its unit has left the table). */
  settleHover() {
    this.interactions.endRedraw();
  }

  destroy() {
    this.clear();
    this.settleHover();
    this.prune(new Set());
    this.textures.destroy();
  }

  get(unitId: string): UnitView | undefined {
    return this.views.get(unitId)?.card;
  }

  playEffect(unitId: string, kind: SpellEffectKind) {
    const view = this.get(unitId);
    if (view) this.animations.playEffect(view, kind);
  }

  playBarrierTrigger(unitId: string) {
    const view = this.get(unitId);
    if (view) this.animations.playBarrierTrigger(view);
  }

  private faceKey(unitId: string) {
    return `arena-face-${unitId}`;
  }

  private sourceImage(key: string) {
    if (!this.scene.textures.exists(key)) return undefined;
    return this.scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  }

  /** Creates a unit lying in its lane. `placement` holds the lane's quad: the card fills it completely. */
  create(unit: UnitInstance, playerId: PlayerId, placement: CardPlacement, options: CardViewOptions = {}) {
    const definition = getCardDefinition(unit.cardId);
    const kind: CardFaceKind = definition.type === "champion" ? "champion" : definition.type === "spell" ? "spell" : "unit";
    const isChampion = kind === "champion";
    const accent = parseInt(CARD_THEME[kind].accent.slice(1), 16);
    const hasBarrier = Boolean(unit.keywords?.includes("BARRIER") || unit.temporaryKeywords?.includes("BARRIER"));
    const attack = getUnitAttack(unit);
    const health = getUnitHealth(unit);
    const trends = statTrends(definition, unit);
    const speed = speedOf(definition);
    const artKey = this.textures.getKey(unit);

    const flatBox = boundsOf(placement.quad);
    const surfaceBox = padBounds(flatBox, FACE_PADDING);

    const renderFace = (quad: Quad) => {
      const [nearLeft, nearRight, farRight, farLeft] = quad;
      const faceWidth = this.faceSize(Math.max(nearRight.x - nearLeft.x, farRight.x - farLeft.x));
      const faceHeight = this.faceSize(nearLeft.y - farLeft.y);
      return this.faceFor(
        unit.instanceId,
        [
          unit.cardId,
          attack,
          health,
          trendKey(trends),
          speed ?? "",
          artKey ? 1 : 0,
          this.scene.textures.exists("arena-card-front") ? 1 : 0,
          this.scene.textures.exists("icon-atk") ? 1 : 0,
          this.fontEpoch,
          faceWidth,
          faceHeight,
        ],
        faceWidth,
        faceHeight,
        (ctx) =>
          paintBoardFace(
            ctx,
            { name: definition.name, kind, attack, health, trends, speed },
            {
              art: artKey ? (this.sourceImage(artKey) as HTMLImageElement) : undefined,
              frame: this.sourceImage("arena-card-front"),
              icons: { attack: this.sourceImage("icon-atk"), health: this.sourceImage("icon-hp") },
            },
            faceWidth,
            faceHeight,
          ),
      );
    };

    const center: Point = { x: flatBox.x + flatBox.width / 2, y: flatBox.y + flatBox.height / 2 };
    const known = this.poses.has(unit.instanceId);
    const pose = this.poseOf(unit.instanceId);
    const wasInLane = pose.base;
    const leavingRole = pose.role;
    pose.base = Boolean(options.inLane);
    pose.role = pose.base ? options.role : undefined;
    pose.picked = Boolean(options.picked);
    pose.hovered = false;
    pose.hover = 0;
    pose.hoverTween?.stop();
    pose.hoverTween = undefined;
    if (!pose.base) {
      // A card on its way back carries on across a redraw; any other card in the waiting row is simply there.
      if (isRetreating(known, wasInLane, pose.base) && !reducedMotion()) {
        this.endDeclare(pose);
        this.beginRetreat(unit.instanceId, pose, center, flatBox, isChampion, leavingRole);
      } else if (!pose.leaving) {
        this.endDeclare(pose);
      }
    } else if (isNewlyDeclared(known, wasInLane, pose.base) && pose.role && !reducedMotion()) {
      this.beginDeclare(unit.instanceId, pose, center, flatBox, isChampion);
    }
    this.centers.set(unit.instanceId, center);

    const surface = new CardSurface(this.scene, this.faceKey(unit.instanceId), surfaceBox);
    surface.paint(renderFace(placement.quad), placement.quad, this.lookOf(pose));

    const shown = surface.displaySize;
    const image = this.scene.add
      .image(surfaceBox.x - center.x, surfaceBox.y - center.y, surface.key)
      .setOrigin(0, 0)
      .setDisplaySize(shown.width, shown.height);
    const rest = { x: image.x, y: image.y, scaleX: image.scaleX, scaleY: image.scaleY };
    const offset = this.offsetOf(pose, center);
    const card = this.scene.add.container(center.x + offset.x, center.y + offset.y, [image]) as UnitView;
    card.unitId = unit.instanceId;
    card.setSize(flatBox.width, flatBox.height);
    card.setDepth(placement.depth);
    card.setData("outline", this.outlineOf(placement.quad, center));
    card.setData("topExtent", flatBox.height / 2);

    const view: CardView = { card, image, rest, surface, renderFace, placement, box: flatBox, pose };
    card.setData("anchorRect", () => this.anchorOf(view));
    const hitArea = new Phaser.Geom.Polygon(this.hitPoints(view));
    this.interactions.bind(card, unit, playerId, hitArea, (hovering) => this.setHovered(view, hovering), () => pose.glide < 1);
    this.animations.attach(card, isChampion, accent, options.isTargetable, options.targetType, hasBarrier);
    this.views.set(unit.instanceId, view);
    this.glideTo(view);
    this.sweepTo(view);
    return card;
  }

  private poseOf(unitId: string): CardPose {
    let pose = this.poses.get(unitId);
    if (!pose) {
      pose = { base: false, picked: false, hovered: false, hover: 0, glide: 1, nudge: { x: 0, y: 0 }, sweep: 1, sweepLaps: 1 };
      this.poses.set(unitId, pose);
    }
    return pose;
  }

  /** What is laid over the face of a card right now: its brand, the light running round it, and the pointer's light. */
  private lookOf(pose: CardPose): CardLook {
    // A card on its way back to the waiting row keeps the colour of the lane it left, fading as it goes.
    const role = pose.base ? pose.role : pose.glide < 1 ? pose.leaving : undefined;
    const color = role ? ROLE_COLOR[role] : undefined;
    const edgeAlpha = pose.base ? 0.6 : 0.6 * (1 - pose.glide);
    const window = color !== undefined && pose.sweep < 1 ? sweepWindow(pose.sweep, pose.sweepLaps) : undefined;
    return {
      edge: color !== undefined ? { color, alpha: edgeAlpha } : undefined,
      sweep: color !== undefined && window ? { color, ...window } : undefined,
      hover: Math.max(pose.hover, pose.picked ? 1 : 0),
      ring: pose.picked
    };
  }

  private outlineOf(quad: Quad, center: Point): Point[] {
    return quad.map((p) => ({ x: p.x - center.x, y: p.y - center.y }));
  }

  /** The card's polygon in the container's own space (origin at its top-left corner). */
  private hitPoints(view: CardView): Point[] {
    const { box, placement } = view;
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    return placement.quad.map((p) => ({ x: p.x - centerX + box.width / 2, y: p.y - centerY + box.height / 2 }));
  }

  /** The pointer lights the edge of a card, and puts the light out when it leaves. */
  private setHovered(view: CardView, hovered: boolean) {
    if (!view.card.active) return;
    const { pose } = view;
    pose.hovered = hovered;
    pose.hoverTween?.stop();
    pose.hoverTween = this.scene.tweens.add({
      targets: pose,
      hover: hovered ? 1 : 0,
      duration: HOVER_FADE_MS,
      ease: "Sine.Out",
      onUpdate: () => this.paintView(view),
      onComplete: () => {
        pose.hoverTween = undefined;
      },
    });
  }

  private paintView(view: CardView) {
    if (!view.card.active) return;
    view.surface.paint(view.renderFace(view.placement.quad), view.placement.quad, this.lookOf(view.pose));
    this.applyHover(view);
  }

  /** A card lifts under the pointer only when it is at rest: not gliding to its lane, not with the light running round it. */
  private liftOf(pose: CardPose) {
    const resting = !reducedMotion() && pose.glide >= 1 && pose.sweep >= 1;
    return resting ? Math.max(pose.hover, pose.picked ? 1 : 0) : 0;
  }

  /** Raises and grows the picture of the card by how strongly the pointer is on it; the card's box and hit area stay. */
  private applyHover(view: CardView) {
    const { image, rest, card, pose, box, placement } = view;
    const t = this.liftOf(pose);
    const { scale, lift } = hoverPose(t, box.height);
    image.setScale(rest.scaleX * scale, rest.scaleY * scale);
    image.setPosition(rest.x * scale, rest.y * scale - lift);
    // Over its neighbours in the row while lifted; still under every effect layer.
    card.setDepth(placement.depth + (t > 0 ? 2 : 0));
  }

  /** Where the card is on the table when the pointer has lifted it: where the inspector stands. */
  private anchorOf(view: CardView) {
    const { card, box } = view;
    const resting = { x: card.x - box.width / 2, y: card.y - box.height / 2, width: box.width, height: box.height };
    return reducedMotion() || view.pose.glide < 1 || view.pose.sweep < 1 ? resting : liftedRect(resting);
  }

  // ── declare ──────────────────────────────────────────────

  /**
   * The card has just been declared into a lane. It glides there from the slot it lay in, a light runs
   * round its edge (twice for a champion), and the table is told, so it can draw the trail.
   */
  private beginDeclare(unitId: string, pose: CardPose, center: Point, box: Bounds, champion: boolean) {
    pose.sweep = 0;
    pose.sweepLaps = champion ? 2 : 1;
    const from = this.centers.get(unitId);
    if (!from || Math.hypot(from.x - center.x, from.y - center.y) <= 2) return;
    pose.glideFrom = from;
    pose.glide = 0;
    if (pose.role) {
      this.onDeclare?.({ unitId, from, to: center, width: box.width, height: box.height, role: pose.role, champion });
    }
  }

  /**
   * The card has been taken out of its lane. It glides back to its slot in the waiting row, its edge fading
   * as it goes, and the table is told so it can leave the shadow step the other way.
   */
  private beginRetreat(unitId: string, pose: CardPose, center: Point, box: Bounds, champion: boolean, role?: CardRole) {
    const from = this.centers.get(unitId);
    if (!from || Math.hypot(from.x - center.x, from.y - center.y) <= 2) return;
    pose.glideFrom = from;
    pose.glide = 0;
    pose.leaving = role;
    if (role) {
      this.onDeclare?.({ unitId, from, to: center, width: box.width, height: box.height, role, champion, retreat: true });
    }
  }

  private endDeclare(pose: CardPose) {
    pose.glideTween?.stop();
    pose.glideTween = undefined;
    pose.sweepTween?.stop();
    pose.sweepTween = undefined;
    pose.glide = 1;
    pose.sweep = 1;
  }

  /** How far the card still is from its slot while it glides (none once it has arrived). */
  private glideOf(pose: CardPose, center: Point): Point {
    return pose.glide < 1 && pose.glideFrom ? glideOffset(pose.glideFrom, center, pose.glide) : { x: 0, y: 0 };
  }

  /** How far the card is from the centre of its slot: still gliding to it, plus any jolt it is taking. */
  private offsetOf(pose: CardPose, center: Point): Point {
    const glide = this.glideOf(pose, center);
    return { x: glide.x + pose.nudge.x, y: glide.y + pose.nudge.y };
  }

  /** Puts the card where its pose says: the one place that moves a card, so a glide and a jolt always agree. */
  private settle(view: CardView) {
    const { card, box, pose } = view;
    if (!card.active) return;
    const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const offset = this.offsetOf(pose, center);
    card.setPosition(center.x + offset.x, center.y + offset.y);
  }

  /**
   * Carries a card that was just declared from the slot it lay in to its slot in the lane. The progress
   * lives in the pose, so a redraw in the middle of the glide carries on from where it was.
   */
  private glideTo(view: CardView) {
    const { card, pose } = view;
    pose.glideTween?.stop();
    pose.glideTween = undefined;
    if (pose.glide >= 1) return;
    pose.glideTween = this.scene.tweens.add({
      targets: pose,
      glide: 1,
      duration: GLIDE_MS * (1 - pose.glide),
      ease: "Linear",
      onUpdate: () => {
        if (!card.active) return;
        this.settle(view);
        // The edge of a card that is leaving its lane fades out with the glide.
        if (pose.leaving) this.paintView(view);
      },
      onComplete: () => {
        pose.glideTween = undefined;
        pose.glide = 1;
        if (pose.leaving) {
          pose.leaving = undefined;
          this.paintView(view);
        }
        this.settle(view);
      },
    });
  }

  /**
   * A card takes a short jolt (it is hit, it lunges). The jolt is part of the card's pose, not a tween on the
   * container: whatever else is moving the card (it may be gliding back to the waiting row) is kept, and the
   * card always ends at its slot, never where it happened to be when the jolt began.
   */
  nudge(unitId: string, jolt: Jolt) {
    const view = this.views.get(unitId);
    if (!view) return;
    const { pose } = view;
    pose.nudgeTween?.stop();
    pose.nudge = { x: 0, y: 0 };
    pose.nudgeTween = this.scene.tweens.add({
      targets: pose.nudge,
      [jolt.axis]: jolt.from === undefined ? jolt.to : { from: jolt.from, to: jolt.to },
      duration: jolt.duration,
      ease: jolt.ease,
      yoyo: jolt.yoyo,
      repeat: jolt.repeat,
      onUpdate: () => this.settle(view),
      onComplete: () => {
        pose.nudgeTween = undefined;
        pose.nudge = { x: 0, y: 0 };
        this.settle(view);
      },
    });
  }

  /** Runs the light round the card's edge; like the glide, it carries on across a redraw. */
  private sweepTo(view: CardView) {
    const { pose } = view;
    pose.sweepTween?.stop();
    pose.sweepTween = undefined;
    if (pose.sweep >= 1) return;
    pose.sweepTween = this.scene.tweens.add({
      targets: pose,
      sweep: 1,
      duration: SWEEP_MS * pose.sweepLaps * (1 - pose.sweep),
      ease: "Linear",
      onUpdate: () => this.paintView(view),
      onComplete: () => {
        pose.sweepTween = undefined;
        pose.sweep = 1;
        this.paintView(view);
      },
    });
  }

  /** On-screen size of a face edge → canvas pixels: supersampled, in steps of 4 so a moving card repaints less often. */
  private faceSize(screenPx: number) {
    return Math.max(64, Math.round((screenPx * FACE_SUPERSAMPLE) / 4) * 4);
  }

  /** Returns the cached face of a unit, repainting it only when what it shows or its size changed. */
  private faceFor(unitId: string, parts: Array<string | number | boolean>, width: number, height: number, paint: (ctx: CanvasRenderingContext2D) => void) {
    const signature = parts.join("|");
    let entry = this.faces.get(unitId);
    if (!entry) {
      entry = { signature: "", canvas: document.createElement("canvas") };
      this.faces.set(unitId, entry);
    }
    if (entry.signature !== signature) {
      entry.canvas.width = width;
      entry.canvas.height = height;
      const ctx = entry.canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingQuality = "high";
        paint(ctx);
      }
      entry.signature = signature;
    }
    return entry.canvas;
  }

  // ── one-shot animations ──────────────────────────────────

  playSummon(unitId: string) {
    const view = this.get(unitId);
    if (view) {
      const restY = view.y;
      view.setAlpha(0).setScale(1.18).setY(restY - 26);
      this.scene.tweens.add({
        targets: view,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        y: restY,
        duration: 340,
        ease: "Back.Out"
      });
    }
  }

  playAttack(unitId: string) {
    const view = this.get(unitId);
    if (view) {
      const riftY = (this.scene.registry.get("arenaRiftY") as number | undefined) ?? logicalSize(this.scene.scale).height / 2;
      this.nudge(unitId, { axis: "y", to: view.y > riftY ? -38 : 38, yoyo: true, duration: 190, ease: "Sine.Out" });
    }
  }

  playDestroy(unitId: string) {
    const view = this.get(unitId);
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
