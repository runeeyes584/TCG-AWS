import type { SpellSpeed } from "@backend/game/types";
import type { Quad } from "../config/arenaProjection";
import type { Trend } from "../../cards/cardStats";
import { SPEED_STYLE } from "../../cards/spellSpeed";

/**
 * Board card face. A card lying in its lane is about as large as a hand card, so the
 * face is painted at the lane's own size and proportions and then laid into the lane's
 * perspective quad. Only what a player needs at a glance is shown, in the order the eye
 * reads it: ATK / HP first (big, saturated diamonds in the upper corners), then the name
 * (bottom), then the artwork. The numbers sit at the top because a card that stands up in
 * front of this one covers its lower part. Rules text and cost are left to the card inspector.
 * The badges are small so most of the artwork shows; a unit above or below its printed stats
 * carries a small arrow beside the number, and a spell carries its speed opposite the cost.
 */

export type CardFaceKind = "unit" | "spell" | "champion";

export interface CardFaceData {
  name: string;
  kind: CardFaceKind;
  attack?: number;
  health?: number;
  /** Where the stats stand against the printed ones (the colours of the stats never change). */
  trends?: { attack?: Trend; health?: Trend };
  /** Only for a spell. */
  speed?: SpellSpeed;
}

export interface CardFaceAssets {
  art?: CanvasImageSource & { width: number; height: number };
  frame?: CanvasImageSource;
  icons: {
    attack?: CanvasImageSource;
    health?: CanvasImageSource;
  };
}

/** Frame colour per card type — identical to the CSS filters on the DOM card. */
const FRAME_FILTER: Record<CardFaceKind, string> = {
  unit: "hue-rotate(180deg) saturate(1.1) brightness(1.05)",
  spell: "hue-rotate(220deg) saturate(1.4)",
  champion: "sepia(1) saturate(3.5) hue-rotate(330deg)",
};

export const CARD_THEME: Record<CardFaceKind, { base: string; accent: string }> = {
  unit: { base: "#070B16", accent: "#6495ED" },
  spell: { base: "#0C0618", accent: "#A855F7" },
  champion: { base: "#120A05", accent: "#F59E0B" },
};

/** Stat colours never change with buffs or damage: red ATK, green HP, always. */
const ATTACK = { ring: "#FCA5A5", text: "#F14935" };
const HEALTH = { ring: "#86EFAC", text: "#22D389" };
/** The arrow beside a stat above (up) or below (down) its printed value. */
const TREND_COLOR: Record<Trend, string> = { up: "#4ADE80", down: "#FF5C7A" };

export function fontFamily(variable: string, fallback: string) {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.body).getPropertyValue(variable).trim();
  return value ? `${value}, ${fallback}` : fallback;
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

/** A small triangle pointing up or down, outlined so it reads on any artwork. */
function trendMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, width: number, trend: Trend) {
  const half = width / 2;
  const tall = width * 0.88;
  const dir = trend === "up" ? -1 : 1;
  ctx.beginPath();
  ctx.moveTo(cx, cy + dir * (tall / 2));
  ctx.lineTo(cx + half, cy - dir * (tall / 2));
  ctx.lineTo(cx - half, cy - dir * (tall / 2));
  ctx.closePath();
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, width * 0.34);
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.stroke();
  ctx.fillStyle = TREND_COLOR[trend];
  ctx.fill();
}

/**
 * A stat diamond: dark plate, ring, faint icon, outlined number, and, when the unit stands above or
 * below its printed value, an arrow on the diamond's inner side (`inward` is +1 to the right, -1 to the left).
 */
function statBadge(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  ring: string,
  textColor: string,
  value: number | undefined,
  icon: CanvasImageSource | undefined,
  numberFont: string,
  trend: Trend | undefined,
  inward: 1 | -1,
) {
  const k = r / 32;
  ctx.save();
  ctx.shadowColor = ring;
  ctx.shadowBlur = 7 * k;
  diamond(ctx, cx, cy, r);
  ctx.fillStyle = "#050B14";
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, 2.2 * k);
  ctx.strokeStyle = ring;
  diamond(ctx, cx, cy, r);
  ctx.stroke();
  if (icon) {
    ctx.save();
    ctx.globalAlpha = 0.35;
    const size = r * 1.1;
    ctx.drawImage(icon, cx - size / 2, cy - size / 2, size, size);
    ctx.restore();
  }
  const text = String(value ?? "-");
  ctx.font = `800 ${Math.round(r * 1.15)}px ${numberFont}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(2, 3.4 * k);
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.strokeText(text, cx, cy + 1);
  ctx.fillStyle = textColor;
  ctx.fillText(text, cx, cy + 1);
  if (trend) {
    const width = r * 0.56;
    trendMark(ctx, cx + inward * (r + width * 0.75), cy, width, trend);
  }
}

/** The speed of a spell: a small diamond in the corner opposite the cost, with the speed's glyph. */
function speedBadge(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, speed: SpellSpeed) {
  const style = SPEED_STYLE[speed];
  const k = r / 24;
  ctx.save();
  ctx.shadowColor = style.color;
  ctx.shadowBlur = 6 * k;
  diamond(ctx, cx, cy, r);
  ctx.fillStyle = "#050B14";
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = Math.max(1.5, 2.2 * k);
  ctx.strokeStyle = style.color;
  diamond(ctx, cx, cy, r);
  ctx.stroke();

  const size = r * 1.1;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(size / 24, size / 24);
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = style.color;
  ctx.stroke(new Path2D(style.glyph));
  ctx.restore();
}

/** Paints a card face of `W` × `H` pixels (square corners, dark body, thorn frame). */
export function paintBoardFace(ctx: CanvasRenderingContext2D, data: CardFaceData, assets: CardFaceAssets, W: number, H: number) {
  const theme = CARD_THEME[data.kind];
  const display = fontFamily("--font-rajdhani", "Rajdhani, Arial Narrow, sans-serif");
  const unitPx = Math.min(W, H);
  const inset = Math.max(3, unitPx * 0.05);

  ctx.clearRect(0, 0, W, H);

  // Card stock: dark body flush with the frame.
  const plate = ctx.createLinearGradient(0, 0, W * 0.4, H);
  plate.addColorStop(0, "#0B0D14");
  plate.addColorStop(1, theme.base);
  ctx.fillStyle = plate;
  ctx.fillRect(0, 0, W, H);

  // Artwork.
  const art = { x: inset, y: inset, w: W - inset * 2, h: H - inset * 2 };
  ctx.save();
  ctx.beginPath();
  ctx.rect(art.x, art.y, art.w, art.h);
  ctx.clip();
  if (assets.art && assets.art.width > 0) {
    const scale = Math.max(art.w / assets.art.width, art.h / assets.art.height);
    const dw = assets.art.width * scale;
    const dh = assets.art.height * scale;
    ctx.drawImage(assets.art, art.x + (art.w - dw) / 2, art.y - Math.min(dh - art.h, dh * 0.04), dw, dh);
  } else {
    const g = ctx.createLinearGradient(0, art.y, 0, art.y + art.h);
    g.addColorStop(0, "#243247");
    g.addColorStop(1, "#080D15");
    ctx.fillStyle = g;
    ctx.fillRect(art.x, art.y, art.w, art.h);
  }
  // Darken towards the bottom so the name stays legible.
  const fade = ctx.createLinearGradient(0, H * 0.58, 0, H);
  fade.addColorStop(0, "rgba(4,3,12,0)");
  fade.addColorStop(0.6, "rgba(4,3,12,0.8)");
  fade.addColorStop(1, "rgba(4,3,12,0.94)");
  ctx.fillStyle = fade;
  ctx.fillRect(art.x, H * 0.58, art.w, H * 0.42);
  ctx.restore();

  // Thorn frame, recoloured per card type.
  if (assets.frame) {
    ctx.save();
    if ("filter" in ctx) ctx.filter = FRAME_FILTER[data.kind];
    ctx.drawImage(assets.frame, 0, 0, W, H);
    ctx.restore();
  } else {
    ctx.lineWidth = Math.max(2, unitPx * 0.03);
    ctx.strokeStyle = theme.accent;
    ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth);
  }
  if (data.kind === "champion") {
    ctx.lineWidth = Math.max(1, unitPx * 0.012);
    ctx.strokeStyle = "rgba(252, 211, 77, 0.6)";
    ctx.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  }

  // 1. Stats: small diamonds in the upper corners (a spell shows its speed instead).
  const r = unitPx * 0.125;
  const statY = inset + r * 0.95;
  if (data.kind !== "spell") {
    statBadge(ctx, inset + r * 0.95, statY, r, ATTACK.ring, ATTACK.text, data.attack, assets.icons.attack, display, data.trends?.attack, 1);
    statBadge(ctx, W - inset - r * 0.95, statY, r, HEALTH.ring, HEALTH.text, data.health, assets.icons.health, display, data.trends?.health, -1);
  } else if (data.speed) {
    speedBadge(ctx, W - inset - r * 0.85, inset + r * 0.85, r * 0.85, data.speed);
  }

  // 2. Name: one line along the bottom edge.
  const maxNameWidth = W - inset * 2 - unitPx * 0.1;
  const name = data.name.toUpperCase();
  let nameSize = Math.max(11, unitPx * 0.14);
  ctx.font = `700 ${nameSize}px ${display}`;
  while (nameSize > 9 && ctx.measureText(name).width > maxNameWidth) {
    nameSize -= 0.5;
    ctx.font = `700 ${nameSize}px ${display}`;
  }
  const nameY = H - inset - nameSize * 0.9;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(2, nameSize * 0.22);
  ctx.strokeStyle = "rgba(0,0,0,0.85)";
  ctx.strokeText(name, W / 2, nameY, maxNameWidth);
  ctx.fillStyle = "#FFF7EC";
  ctx.fillText(name, W / 2, nameY, maxNameWidth);

  // Thin accent rim on the card edge.
  ctx.lineWidth = 1;
  ctx.strokeStyle = `${theme.accent}52`;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
}

/**
 * Draws `source` into `quad` (destination coordinates) as thin horizontal strips.
 * Row edges are horizontal in our projection, so each strip only needs its own
 * left/right x — this gives the taper and the per-column skew of a slot, and also
 * the wider far edge of a card that is standing up. `density` is the canvas's pixels per logical pixel.
 */
export function drawIntoQuad(ctx: CanvasRenderingContext2D, source: CanvasImageSource, sourceWidth: number, sourceHeight: number, quad: Quad, density = 1) {
  const [nl, nr, fr, fl] = quad;
  // About one strip per pixel row of the canvas it is laid into.
  const strips = Math.min(192, Math.max(48, Math.ceil((nl.y - fl.y) * density)));
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  for (let i = 0; i < strips; i += 1) {
    const t0 = i / strips;
    const t1 = (i + 1) / strips;
    // t runs from the far edge (top of the card) to the near edge (bottom).
    const y0 = lerp(fl.y, nl.y, t0);
    const y1 = lerp(fl.y, nl.y, t1);
    const left = lerp(fl.x, nl.x, (t0 + t1) / 2);
    const right = lerp(fr.x, nr.x, (t0 + t1) / 2);
    const sy = sourceHeight * t0;
    const sh = sourceHeight * (t1 - t0);
    ctx.drawImage(source, 0, sy, sourceWidth, sh, left, y0, right - left, y1 - y0 + 0.75);
  }
}
