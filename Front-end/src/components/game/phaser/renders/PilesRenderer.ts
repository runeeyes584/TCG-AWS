import * as Phaser from "phaser";
import { Layers, Skull } from "lucide-react";
import { getCardDefinition, hasCard } from "@backend/game/entities/cardRegistry";
import type { ArenaEventMap } from "../../../../libs/arenaEventBus";
import { pileAccent, stackLayers, type PileSide, type PileTone } from "../../hud/piles/pileLook";
import type { PileState } from "../../hud/piles/pileState";
import { arenaEventAdapter } from "../adapters/arenaEventAdapter";
import { densityOf } from "../config/arenaScale";
import { CAUSE_COLOR, KIND_COLOR, clamp01, easeOut } from "../config/graveyardFxMotion";
import { PILE_IDS, type PileId, type PileLayout, type PileRect } from "../config/pileLayout";
import { TextureLoader } from "../systems/TextureLoader";
import { acquireCanvasTexture } from "./canvasTexture";
import { fontFamily } from "./cardFace";
import { loadIconTexture } from "./iconTexture";
import { BAND_RATIO, paintPileFace } from "./pileFace";

type Fx = ArenaEventMap["GRAVEYARD_FX"];

/** Above the cards and the table, under the effects of the graveyards (9300), the banner (9400) and the Nexus carry (9500). */
const DEPTH = 8500;

const HOVER_EASE_MS = 100;
const KNOCK_MS = 260;
const FLASH_MS = 520;
const REDUCED_FLASH_MS = 200;
const HOP = { ms: 380, rise: 6 } as const;
const SHAKE = { ms: 320, amplitude: 3.5 } as const;
const BREATH_MS = 2400;
const WISP_MS = 3400;
/** Narrower than this a pile has no room for the word on its band: the icon says it. */
const LABEL_MIN_WIDTH = 64;
const BONE = "#ece7ff";

const TONES: Record<PileTone, { main: number; bright: number; text: string }> = {
  viewer: { main: 0xa78bfa, bright: 0xddd6fe, text: BONE },
  opponent: { main: 0xff6f93, bright: 0xffc2d1, text: "#ffe3ea" },
  amber: { main: 0xe8c26a, bright: 0xf8e3a6, text: "#f3cf72" },
  red: { main: 0xff2e63, bright: 0xff8aa6, text: "#ff7f9d" }
};

const LABEL = { deck: "DECK", graveyard: "GRAVE" } as const;

interface Flash {
  color: number;
  /** ms since it was asked for; negative while it waits for the effect on the arena to arrive. */
  age: number;
  duration: number;
}

interface Timer {
  age: number;
}

interface PileView {
  id: PileId;
  side: PileSide;
  box: Phaser.GameObjects.Container;
  body: Phaser.GameObjects.Graphics;
  face: Phaser.GameObjects.Image;
  frame: Phaser.GameObjects.Graphics;
  over: Phaser.GameObjects.Graphics;
  icon: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  count: Phaser.GameObjects.Text;
  rect?: PileRect;
  state?: PileState;
  faceLook: string;
  laidOut: string;
  hover: number;
  press: number;
  /** 1 right after the count changed, down to 0. */
  knock: number;
  flashes: Flash[];
  hop?: Timer;
  shake?: Timer;
  /** Free-running clock for what breathes and what drifts. */
  phase: number;
  dirty: boolean;
}

/** A dashed rectangle: the hollow where a pile with no card would stand. */
function dashedRect(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, dash: number, gap: number) {
  const edges: Array<[number, number, number, number]> = [
    [x, y, x + w, y],
    [x + w, y, x + w, y + h],
    [x + w, y + h, x, y + h],
    [x, y + h, x, y]
  ];
  for (const [x1, y1, x2, y2] of edges) {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const dx = (x2 - x1) / length;
    const dy = (y2 - y1) / length;
    for (let at = 0; at < length; at += dash + gap) {
      const end = Math.min(at + dash, length);
      g.lineBetween(x1 + dx * at, y1 + dy * at, x1 + dx * end, y1 + dy * end);
    }
  }
}

/**
 * The decks and the graveyards of both players, painted on the arena canvas: each a stack of cards with square
 * corners and the ratio of the cards of the hand, the card back (or, for a graveyard, the card that fell last under a
 * violet veil) on top, and a band at its foot with the icon, the word and the count. The DOM buttons of the dock take the
 * pointer and the rules (`PILES_STATE`); the arena says where the piles stand (`layout`). A pile lifts, glows, knocks its
 * count when it changes, and reacts to what the graveyard does (`GRAVEYARD_FX`). A pile is always a plain rectangle:
 * hovering never changes its shape, only its light and how high it stands.
 */
export class PilesRenderer {
  private readonly views: Record<PileId, PileView>;
  private readonly loader: TextureLoader;
  private readonly unsubscribe: Array<() => void> = [];
  private readonly textureKeys = new Set<string>();
  private readonly motion?: MediaQueryList;
  private calm: boolean;
  private facesStale = false;
  private layoutKey = "";
  /** The plates under each player's piles and the strip of the rift between them. */
  private readonly plates: Phaser.GameObjects.Graphics;
  private plateLayout?: Pick<PileLayout, "plates" | "divider">;

  constructor(private readonly scene: Phaser.Scene) {
    this.loader = new TextureLoader(scene, () => {
      this.facesStale = true;
    });
    this.loader.request("pile-card-back", "/monster/card-back.png");
    const icon = { size: 64, color: BONE, strokeWidth: 2 } as const;
    loadIconTexture(scene, "pile-icon-deck", Layers, icon, () => this.touchAll());
    loadIconTexture(scene, "pile-icon-graveyard", Skull, icon, () => this.touchAll());

    // Under every pile: it shows whose they are.
    this.plates = scene.add.graphics().setDepth(DEPTH - 1);
    this.views = Object.fromEntries(PILE_IDS.map((id) => [id, this.createView(id)])) as Record<PileId, PileView>;

    this.motion = typeof window === "undefined" ? undefined : window.matchMedia?.("(prefers-reduced-motion: reduce)");
    this.calm = Boolean(this.motion?.matches);
    const onMotionChange = () => {
      this.calm = Boolean(this.motion?.matches);
      this.touchAll();
    };
    this.motion?.addEventListener?.("change", onMotionChange);
    this.unsubscribe.push(() => this.motion?.removeEventListener?.("change", onMotionChange));

    // The fonts may arrive after the first paint.
    void document.fonts?.ready.then(() => {
      if (this.scene.sys?.isActive()) this.applyFonts();
    });
    this.applyFonts();

    // Phaser starts after React has already reported the piles, so pick up the last report first.
    this.unsubscribe.push(
      arenaEventAdapter.on("PILES_STATE", (state) => this.setState(state)),
      arenaEventAdapter.on("GRAVEYARD_FX", (fx) => this.react(fx))
    );
    this.setState(arenaEventAdapter.latest("PILES_STATE"));
  }

  private createView(id: PileId): PileView {
    const scene = this.scene;
    const body = scene.add.graphics();
    const face = scene.add.image(0, 0, "__DEFAULT");
    const frame = scene.add.graphics();
    const over = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    const icon = scene.add.image(0, 0, "__DEFAULT").setAlpha(0.92);
    const label = scene.add.text(0, 0, "", { fontStyle: "600" }).setOrigin(0, 0.5);
    const count = scene.add.text(0, 0, "", { fontStyle: "700" }).setOrigin(1, 0.5);
    const resolution = Math.min(3, (typeof window === "undefined" ? 1 : window.devicePixelRatio || 1) * 1.5);
    label.setResolution(resolution);
    count.setResolution(resolution);
    const box = scene.add.container(0, 0, [body, face, frame, over, icon, label, count]).setDepth(DEPTH).setVisible(false);

    return {
      id,
      side: id.startsWith("opponent") ? "opponent" : "viewer",
      box,
      body,
      face,
      frame,
      over,
      icon,
      label,
      count,
      faceLook: "",
      laidOut: "",
      hover: 0,
      press: 0,
      knock: 0,
      flashes: [],
      phase: PILE_IDS.indexOf(id) * 600,
      dirty: true
    };
  }

  private applyFonts() {
    const display = fontFamily("--font-rajdhani", "Rajdhani, Arial Narrow, sans-serif");
    const mono = fontFamily("--font-geist-mono", "ui-monospace, monospace");
    for (const id of PILE_IDS) {
      this.views[id].count.setFontFamily(display);
      this.views[id].label.setFontFamily(mono);
      this.views[id].dirty = true;
    }
  }

  private touchAll() {
    this.facesStale = true;
    PILE_IDS.forEach((id) => {
      const view = this.views[id];
      view.dirty = true;
      // An icon that has just loaded: lay the band out again (its look key includes whether the icon is there).
      this.refresh(view);
    });
  }

  /** Where the piles stand; also called when the canvas is resized. */
  layout(layout: PileLayout) {
    const key = PILE_IDS.map((id) => {
      const { x, y, width, height } = layout.slots[id];
      return `${x},${y},${width},${height}`;
    }).join("|") + `|${layout.divider}`;
    if (key === this.layoutKey) return;
    this.layoutKey = key;
    this.plateLayout = { plates: layout.plates, divider: layout.divider };
    this.paintPlates();
    for (const id of PILE_IDS) {
      this.views[id].rect = layout.slots[id];
      this.views[id].dirty = true;
      this.refresh(this.views[id]);
    }
  }

  setState(state: ArenaEventMap["PILES_STATE"]) {
    for (const id of PILE_IDS) {
      const view = this.views[id];
      const next: PileState | undefined = state?.[id];
      if (view.state && next && view.state.count !== next.count && !this.calm) view.knock = 1;
      view.state = next;
      view.dirty = true;
      this.refresh(view);
    }
  }

  /** The reaction of a graveyard to what happened to it, `delayMs` after the event, in step with its effect on the arena. */
  private react(fx: Fx) {
    const view = this.views[fx.tone === "viewer" ? "viewerGraveyard" : "opponentGraveyard"];
    const color = fx.kind === "ENTER" ? (fx.cause ? CAUSE_COLOR[fx.cause] : TONES[view.side].main) : KIND_COLOR[fx.kind];
    view.flashes.push({ color, age: -fx.delayMs, duration: this.calm ? REDUCED_FLASH_MS : FLASH_MS });
    if (!this.calm && fx.kind === "REVIVE") view.hop = { age: -fx.delayMs };
    if (!this.calm && fx.kind === "BANISH") view.shake = { age: -fx.delayMs };
    view.dirty = true;
  }

  /** Brings a pile's face, texts and visibility up to date with its box and its state. */
  private refresh(view: PileView) {
    const { rect, state } = view;
    const shown = Boolean(rect && state);
    view.box.setVisible(shown);
    if (!rect || !state) return;
    this.bakeFace(view, rect, state);
    this.layoutTexts(view, rect, state);
  }

  private source(key: string): HTMLImageElement | undefined {
    if (!this.scene.textures.exists(key)) return undefined;
    return this.scene.textures.get(key).getSourceImage() as HTMLImageElement;
  }

  /** The picture for the face: the card back, or the art of the card on top of the graveyard (asked for, and used once it has come). */
  private pictureOf(state: PileState): HTMLImageElement | undefined {
    if (state.kind === "deck") return this.source("pile-card-back");
    const cardId = state.topCardId;
    if (!cardId || !hasCard(cardId)) return undefined;
    const url = getCardDefinition(cardId).imageUrl?.trim();
    if (!url) return undefined;
    const key = `arena-card-${cardId}`;
    this.loader.request(key, url);
    return this.source(key);
  }

  /** Paints the face again only when what it shows has changed. */
  private bakeFace(view: PileView, rect: PileRect, state: PileState) {
    const picture = this.pictureOf(state);
    const empty = state.count <= 0;
    const look = `${state.kind}|${empty ? 1 : 0}|${state.topCardId ?? ""}|${picture ? 1 : 0}|${rect.width}x${rect.height}`;
    if (look === view.faceLook) return;
    view.faceLook = look;

    const key = `pile-face-${view.id}`;
    const { texture, ctx } = acquireCanvasTexture(this.scene, key, rect.width, rect.height, densityOf(this.scene.scale));
    paintPileFace(ctx, { kind: state.kind, width: rect.width, height: rect.height, picture, empty });
    texture.refresh();
    this.textureKeys.add(key);
    view.face.setTexture(key).setDisplaySize(rect.width, rect.height);
  }

  /** The icon, the word and the count on the band at the foot of the pile. */
  private layoutTexts(view: PileView, rect: PileRect, state: PileState) {
    const accent = pileAccent(state.kind, state.count, view.side);
    // The icon is an image that loads after the first paint: until then it is not shown (an unknown texture would be
    // drawn as the green missing-texture box), and when it arrives the band is laid out again.
    const iconKey = `pile-icon-${state.kind}`;
    const iconReady = this.scene.textures.exists(iconKey);
    const look = `${rect.width}x${rect.height}|${state.kind}|${state.count}|${accent.tone}|${iconReady ? 1 : 0}`;
    if (look === view.laidOut) return;
    view.laidOut = look;

    const { width: w, height: h } = rect;
    const bandHeight = Math.round(h * BAND_RATIO);
    const centerY = h / 2 - bandHeight / 2;
    const pad = Math.max(3, Math.round(w * 0.07));
    const iconSize = Math.round(bandHeight * 0.56);

    view.icon.setVisible(iconReady);
    if (iconReady) view.icon.setTexture(iconKey).setDisplaySize(iconSize, iconSize).setPosition(-w / 2 + pad + iconSize / 2, centerY);
    view.label
      .setVisible(w >= LABEL_MIN_WIDTH)
      .setText(LABEL[state.kind])
      .setFontSize(`${Math.max(7, Math.round(bandHeight * 0.36))}px`)
      .setLetterSpacing(Math.max(1, w * 0.012))
      .setColor("#b4acd0")
      .setPosition(-w / 2 + pad + iconSize + 4, centerY);
    view.count
      .setText(String(state.count))
      .setFontSize(`${Math.round(bandHeight * 0.8)}px`)
      .setColor(TONES[accent.tone].text)
      .setPosition(w / 2 - pad, centerY);
  }

  tick(delta: number) {
    if (this.facesStale) {
      this.facesStale = false;
      for (const id of PILE_IDS) {
        const { rect, state } = this.views[id];
        if (rect && state) this.bakeFace(this.views[id], rect, state);
      }
    }
    for (const id of PILE_IDS) {
      const view = this.views[id];
      if (!view.rect || !view.state) continue;
      this.advance(view, delta);
      if (view.dirty || this.animating(view)) {
        this.paint(view);
        view.dirty = false;
      }
    }
  }

  private advance(view: PileView, delta: number) {
    const hoverTarget = view.state?.hover ? 1 : 0;
    const pressTarget = view.state?.pressed ? 1 : 0;
    const follow = (value: number, target: number) => {
      if (this.calm) return target;
      const next = value + (target - value) * Math.min(1, delta / HOVER_EASE_MS);
      return Math.abs(target - next) < 0.01 ? target : next;
    };
    view.hover = follow(view.hover, hoverTarget);
    view.press = follow(view.press, pressTarget);
    view.knock = Math.max(0, view.knock - delta / KNOCK_MS);
    view.phase += delta;

    for (const flash of view.flashes) flash.age += delta;
    view.flashes = view.flashes.filter((flash) => flash.age < flash.duration);
    if (view.hop) {
      view.hop.age += delta;
      if (view.hop.age >= HOP.ms) view.hop = undefined;
    }
    if (view.shake) {
      view.shake.age += delta;
      if (view.shake.age >= SHAKE.ms) view.shake = undefined;
    }
  }

  private animating(view: PileView): boolean {
    const state = view.state;
    if (!state) return false;
    const accent = pileAccent(state.kind, state.count, view.side);
    return (
      view.hover !== (state.hover ? 1 : 0) ||
      view.press !== (state.pressed ? 1 : 0) ||
      view.knock > 0 ||
      view.flashes.length > 0 ||
      Boolean(view.hop) ||
      Boolean(view.shake) ||
      (!this.calm && (accent.breathes || (state.kind === "graveyard" && accent.glow > 0)))
    );
  }

  private paint(view: PileView) {
    const { rect, state } = view;
    if (!rect || !state) return;
    const { width: w, height: h } = rect;
    const hw = w / 2;
    const hh = h / 2;
    const accent = pileAccent(state.kind, state.count, view.side);
    const tone = TONES[accent.tone];
    const empty = state.count <= 0;
    const lift = easeOut(view.hover);
    const breath = accent.breathes && !this.calm ? 0.5 + 0.5 * Math.sin((view.phase / BREATH_MS) * Math.PI * 2) : 1;

    // Where the pile stands now: raised towards the table, hopping, shaking.
    const hop = view.hop && view.hop.age >= 0 ? -HOP.rise * Math.sin(Math.PI * clamp01(view.hop.age / HOP.ms)) : 0;
    const shakeP = view.shake && view.shake.age >= 0 ? clamp01(view.shake.age / SHAKE.ms) : 1;
    const shake = view.shake ? SHAKE.amplitude * Math.sin(shakeP * Math.PI * 6) * (1 - shakeP) : 0;
    // With less motion a pile does not rise or grow under the pointer: only its light changes.
    const rise = this.calm ? 0 : lift;
    view.box
      .setPosition(rect.x + hw + shake + rise * 2, rect.y + hh - rise * 5 + hop)
      .setScale((1 + 0.035 * rise) * (1 - (this.calm ? 0 : 0.03) * view.press));
    view.count.setScale(1 + 0.5 * view.knock);

    // Behind the face: shadow, glow, and the sheets of the stack, each a rectangle.
    const body = view.body.clear();
    if (!empty) {
      for (let k = 0; k < 3; k += 1) {
        body.fillStyle(0x000000, 0.2 - k * 0.06);
        body.fillRect(-hw + 2 + k * 2, -hh + 3 + k * 2, w, h);
      }
    }
    const glow = accent.glow * 0.05 + lift * 0.12;
    if (glow > 0) {
      for (let k = 3; k >= 1; k -= 1) {
        body.fillStyle(tone.main, glow * (1 - k / 4));
        body.fillRect(-hw - k * 4, -hh - k * 4, w + k * 8, h + k * 8);
      }
    }
    const layers = stackLayers(state.kind, state.count);
    const step = Math.max(1.5, w * 0.024);
    for (let sheet = layers - 1; sheet >= 1; sheet -= 1) {
      const offset = sheet * step;
      body.fillStyle(sheet % 2 ? 0x140d26 : 0x0e0919, 1);
      body.fillRect(-hw - offset, -hh + offset, w, h);
      body.lineStyle(1, tone.main, 0.4);
      body.strokeRect(-hw - offset, -hh + offset, w, h);
    }

    // The frame, over the face.
    const frame = view.frame.clear();
    if (empty) {
      frame.lineStyle(1.5, tone.main, 0.45);
      dashedRect(frame, -hw, -hh, w, h, 5, 4);
    } else {
      frame.lineStyle(2, tone.main, (0.46 + 0.32 * breath) * (1 - lift));
      frame.strokeRect(-hw, -hh, w, h);
      frame.lineStyle(1, 0x000000, 0.55);
      frame.strokeRect(-hw + 1.5, -hh + 1.5, w - 3, h - 3);
      if (lift > 0) {
        frame.lineStyle(2, tone.bright, lift);
        frame.strokeRect(-hw, -hh, w, h);
        frame.lineStyle(1, tone.bright, 0.35 * lift);
        frame.strokeRect(-hw - 2, -hh - 2, w + 4, h + 4);
      }
    }

    // Light on top: what the graveyard just did, and the souls of one that holds many.
    const over = view.over.clear();
    for (const flash of view.flashes) {
      if (flash.age < 0) continue;
      const p = flash.age / flash.duration;
      over.fillStyle(flash.color, 0.7 * (1 - p) * (1 - p));
      over.fillRect(-hw, -hh, w, h);
    }
    if (!this.calm && state.kind === "graveyard" && !empty) {
      for (let k = 0; k < accent.glow; k += 1) {
        const t = (view.phase / WISP_MS + k * 0.37) % 1;
        over.fillStyle(tone.bright, 0.8 * Math.sin(Math.PI * t));
        over.fillCircle(-hw * 0.5 + (k * 0.5) * w * 0.5 + Math.sin(t * 6 + k) * w * 0.06, hh - t * h * 0.9, Math.max(1.2, w * 0.025));
      }
    }
  }

  /**
   * The plate under each player's piles: a faint panel in that player's colour (violet for the viewer, rose for the
   * opponent) with a lit edge, and between the two plates the strip of the rift with a diamond on it. Plain rectangles.
   */
  private paintPlates() {
    const layout = this.plateLayout;
    const g = this.plates.clear();
    if (!layout) return;
    const sides: Array<[PileRect, PileSide]> = [[layout.plates.opponent, "opponent"], [layout.plates.viewer, "viewer"]];
    for (const [plate, side] of sides) {
      const tone = TONES[side];
      g.fillStyle(0x08050f, 0.55).fillRect(plate.x, plate.y, plate.width, plate.height);
      g.fillStyle(tone.main, 0.08).fillRect(plate.x, plate.y, plate.width, plate.height);
      g.lineStyle(1, tone.main, 0.45).strokeRect(plate.x + 0.5, plate.y + 0.5, plate.width - 1, plate.height - 1);
      // A short bright bar at the outer end of the plate: the side's colour, read at a glance.
      const outerY = side === "opponent" ? plate.y : plate.y + plate.height - 2;
      g.fillStyle(tone.bright, 0.85).fillRect(plate.x, outerY, plate.width, 2);
    }
    // The divider between the plates: a line across the column with a diamond in the middle.
    const left = layout.plates.opponent.x;
    const right = left + layout.plates.opponent.width;
    const mid = (left + right) / 2;
    g.lineStyle(1, 0xc4b5fd, 0.5).lineBetween(left, layout.divider + 0.5, right, layout.divider + 0.5);
    g.fillStyle(0xc4b5fd, 0.9);
    g.fillTriangle(mid - 4, layout.divider + 0.5, mid, layout.divider - 3.5, mid + 4, layout.divider + 0.5);
    g.fillTriangle(mid - 4, layout.divider + 0.5, mid, layout.divider + 4.5, mid + 4, layout.divider + 0.5);
  }

  destroy() {
    this.plates.destroy();
    this.unsubscribe.splice(0).forEach((stop) => stop());
    this.loader.destroy();
    for (const id of PILE_IDS) this.views[id].box.destroy();
    for (const key of this.textureKeys) if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    this.textureKeys.clear();
  }
}
