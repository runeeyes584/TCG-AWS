/**
 * Shared pseudo-3D projection for the arena.
 *
 * The table is a trapezoid seen from a raised camera. Every Phaser layer (table,
 * lanes, cards, nexus, VFX anchors) derives its screen position from the same
 * `project(s, u)` so they all agree:
 *   s ∈ [0, 1]  depth along the table, 0 = near edge (player), 1 = far edge (opponent)
 *   u ∈ [-1, 1] lateral position across the table width at that depth
 *
 * Perspective: widths shrink as 1 / (1 + q·s) and row depths shrink faster, as
 * (1 + q·s)^-DEPTH_TAPER. That is what a camera does (a far row is both narrower and
 * flatter), so near and far lanes keep the same shape instead of the far ones turning
 * into tall slivers. The numbers come from the Figma / SVG concept: depth ratio of the
 * rows ≈ 1.86 while the width ratio is ≈ 1.4–1.7, table about 0.45–0.55 as deep as wide.
 *
 * Layout, from the player's edge to the opponent's edge:
 *   waiting row · active row · narrow rift · active row · waiting row
 * The slab is fitted between the two hand docks and centred in that band; the altars
 * stand beside it, never on top of it.
 */

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point]; // nearLeft, nearRight, farRight, farLeft

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Smallest rectangle containing every point. */
export function boundsOf(points: Point[]): Bounds {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Grows a rectangle by `pad` on every side. */
export function padBounds(bounds: Bounds, pad: number): Bounds {
  return { x: bounds.x - pad, y: bounds.y - pad, width: bounds.width + pad * 2, height: bounds.height + pad * 2 };
}

export type ArenaRowKey = "meWaiting" | "meActive" | "oppActive" | "oppWaiting";

export const ARENA_COLUMNS = 6;

// ── Layout along the table depth (s) ────────────────────────────────────────
const NEAR_MARGIN_S = 0.04;
const FAR_MARGIN_S = 0.03;
/** Gap between the waiting and the active row of the same side. */
const ROW_GAP_S = 0.025;
/** The empty band between the two active rows, where the rift is drawn. */
const RIFT_S = 0.06;
const ROW_DEPTH_S = (1 - NEAR_MARGIN_S - FAR_MARGIN_S - 2 * ROW_GAP_S - RIFT_S) / 4;

const ROW_RANGE_S: Record<ArenaRowKey, readonly [number, number]> = {
  meWaiting: [NEAR_MARGIN_S, NEAR_MARGIN_S + ROW_DEPTH_S],
  meActive: [NEAR_MARGIN_S + ROW_DEPTH_S + ROW_GAP_S, NEAR_MARGIN_S + 2 * ROW_DEPTH_S + ROW_GAP_S],
  oppActive: [1 - FAR_MARGIN_S - 2 * ROW_DEPTH_S - ROW_GAP_S, 1 - FAR_MARGIN_S - ROW_DEPTH_S - ROW_GAP_S],
  oppWaiting: [1 - FAR_MARGIN_S - ROW_DEPTH_S, 1 - FAR_MARGIN_S],
};

const RIFT_BAND_S = { near: ROW_RANGE_S.meActive[1], far: ROW_RANGE_S.oppActive[0] } as const;

// ── Layout across the table width (u) ───────────────────────────────────────
const COLUMN_SPAN_U = 0.95;
const COLUMN_STEP_U = (COLUMN_SPAN_U * 2) / ARENA_COLUMNS;
const COLUMN_GAP_U = 0.05;
const TABLE_HALF_WIDTH_U = 1;

// ── Camera ──────────────────────────────────────────────────────────────────
/** Exponent of the row-depth taper (1 = rows shrink like widths; the concept uses ≈ 1.4). */
const DEPTH_TAPER = 1.4;
/** Viewing elevation in degrees for the default tilt; more tilt = a lower, more oblique camera. */
const elevationDegrees = (tilt: number) => clamp(70 - tilt * 100, 25, 70);
/** Table depth / table width on screen: shallower for a more oblique camera. */
const tableAspect = (tilt: number) => clamp(0.66 - tilt * 0.65, 0.35, 0.8);
/** Width ratio near / far: grows with the tilt. */
const widthRatio = (tilt: number) => clamp(1.3 + tilt, 1.25, 1.9);

// ── Space reserved around the slab ──────────────────────────────────────────
/** Room (px) above / below the table for the opponent / player hand docks. */
const insetTop = (height: number) => Math.min(136, Math.max(84, height * 0.12));
const insetBottom = (height: number) => Math.min(176, Math.max(122, height * 0.155));
/** Screen columns kept clear of the altars: the DOM HUD (counters on the left, the Nexus HUD column on the right). */
const HUD_SIDE_PAD = 232;

/** Altar design size (px at scale 1): the dais ring is 2 × ALTAR_HALF_WIDTH wide. */
const ALTAR_HALF_WIDTH = 150;
const ALTAR_TABLE_GAP = 14;
/** Depth at which each altar stands beside the table. */
const ALTAR_DEPTH_S = { opponent: 0.8, me: 0.2 } as const;
const ALTAR_MIN_SCALE = 0.32;
/** Radius (px at scale 1) of the Nexus core ring that stands at each altar position. */
export const NEXUS_CORE_RADIUS = 78;

export interface SlotGeometry {
  quad: Quad;
  center: Point;
  /** Slot width in px at its depth. */
  width: number;
  /** Slot height in px (foreshortened). */
  depth: number;
  /** 0..1 — how far from the camera (for scaling effects). */
  s: number;
  /** Table-space extent of the slot, used to rebuild it lifted off the table. */
  bounds: { s0: number; s1: number; u0: number; u1: number };
}

/** Everything a card needs to be drawn lying in a slot and standing up from it. */
export interface CardPlacement {
  /** The card's footprint lying flat: it fills the whole slot. */
  quad: Quad;
  /** The same card rotated about its near edge by `degrees` (0 = flat). */
  liftedQuad: (degrees: number) => Quad;
  /**
   * How far the card stands up when it is raised: the complement of the camera
   * elevation, so the card faces the camera squarely and reads like a hand card.
   */
  standDegrees: number;
  /** Phaser display depth: nearer rows are drawn over farther ones. */
  depth: number;
}

export interface ArenaProjection {
  width: number;
  height: number;
  portrait: boolean;
  cx: number;
  yNear: number;
  yFar: number;
  wNear: number;
  wFar: number;
  tableQuad: Quad;
  tableThickness: number;
  /** Unit used to scale decorative objects (rune rings, shards). */
  unit: number;
  project: (s: number, u: number) => Point;
  widthAt: (s: number) => number;
  slot: (row: ArenaRowKey, column: number) => SlotGeometry;
  cardPlacement: (slot: SlotGeometry) => CardPlacement;
  /** Table-space depth range of the band between the active rows. */
  riftBand: { near: number; far: number };
  /** Altars stand beside the table; `scale` shrinks them when the sides are tight. */
  nexus: { opponent: Point; me: Point; scale: number };
  riftY: number;
  /**
   * The table's left edge as the DOM HUD needs it: its x at the rift's height, and how many
   * px it leans towards the centre per px climbed (the far edge is narrower than the near one).
   */
  riftEdge: { left: number; slope: number };
}

export function createArenaProjection(width: number, height: number, tilt: number, zoom: number): ArenaProjection {
  const portrait = width / height < 0.85;

  const elevation = elevationDegrees(tilt);
  const q = widthRatio(tilt) - 1;
  const taper = (depthS: number) => 1 + q * depthS;
  /** Share of the table's screen depth covered between the near edge and `depthS`. */
  const depthFraction = (depthS: number) => (1 - taper(depthS) ** (1 - DEPTH_TAPER)) / (q * (DEPTH_TAPER - 1));
  const fullDepth = depthFraction(1);

  const tableThickness = Math.max(12, height * 0.034);
  // Fit the slab (top surface + its thickness) into the band between the hand docks and
  // centre it there, so neither edge touches a hand. The width is capped by the screen,
  // the depth by the band; whichever binds sets the size of the whole table.
  const bandTop = insetTop(height);
  const bandBottom = height - insetBottom(height);
  const fitDepth = bandBottom - bandTop - tableThickness;
  const maxWidthNear = (portrait ? width * 1.04 : width * 0.68) * clamp(zoom, 0.85, 1.15);
  const aspect = tableAspect(tilt);
  const depthPx = Math.min(fitDepth, maxWidthNear * aspect, height * (portrait ? 0.5 : 0.8));
  const wNear = depthPx / aspect;
  const wFar = wNear / taper(1);
  const slabTop = bandTop + (bandBottom - bandTop - (depthPx + tableThickness)) / 2;
  const yNear = slabTop + depthPx;
  const yFar = slabTop;
  const cx = width / 2;

  const widthAt = (depthS: number) => wNear / taper(depthS);
  const yAt = (depthS: number) => yNear - (depthPx * depthFraction(depthS)) / fullDepth;
  const project = (depthS: number, u: number): Point => ({ x: cx + (u * widthAt(depthS)) / 2, y: yAt(depthS) });

  const slot = (row: ArenaRowKey, column: number): SlotGeometry => {
    const [s0, s1] = ROW_RANGE_S[row];
    const c = (s0 + s1) / 2;
    const u0 = -COLUMN_SPAN_U + column * COLUMN_STEP_U + COLUMN_GAP_U / 2;
    const u1 = u0 + COLUMN_STEP_U - COLUMN_GAP_U;
    return {
      quad: [project(s0, u0), project(s0, u1), project(s1, u1), project(s1, u0)],
      center: project(c, (u0 + u1) / 2),
      width: ((u1 - u0) * widthAt(c)) / 2,
      depth: yAt(s0) - yAt(s1),
      s: c,
      bounds: { s0, s1, u0, u1 },
    };
  };

  /**
   * Rotates the card about its near edge. The far edge swings towards the camera (its
   * ground point moves closer) and up by the card's depth projected through the camera
   * elevation. Both edges stay horizontal, so `drawIntoQuad` can still map the face.
   */
  const liftedQuad = (geo: SlotGeometry, degrees: number): Quad => {
    const { s0, s1, u0, u1 } = geo.bounds;
    const theta = (degrees * Math.PI) / 180;
    const sFar = s0 + (s1 - s0) * Math.cos(theta);
    const rise = ((yAt(s0) - yAt(s1)) * Math.sin(theta)) / Math.tan((elevation * Math.PI) / 180);
    const lift = (p: Point): Point => ({ x: p.x, y: p.y - rise });
    return [project(s0, u0), project(s0, u1), lift(project(sFar, u1)), lift(project(sFar, u0))];
  };

  const cardPlacement = (geo: SlotGeometry): CardPlacement => ({
    quad: geo.quad,
    liftedQuad: (degrees) => liftedQuad(geo, degrees),
    standDegrees: 90 - elevation,
    depth: 10 + geo.center.y,
  });

  const edgeNear = project(0, -TABLE_HALF_WIDTH_U);
  const edgeFar = project(1, -TABLE_HALF_WIDTH_U);
  const edgeRise = edgeNear.y - edgeFar.y;
  const edgeSlope = edgeRise > 0 ? (edgeFar.x - edgeNear.x) / edgeRise : 0;
  const riftY = yAt(0.5);
  const riftEdge = { left: edgeNear.x + edgeSlope * (edgeNear.y - riftY), slope: edgeSlope };

  const unit = Math.max(0.42, Math.min(0.95, (height / 900) * 0.55));

  // Altars stand just outside the slab, at the side of the row each one guards. When the
  // gap between slab and HUD is narrow the altar shrinks instead of covering the table.
  const altar = (depthS: number, side: -1 | 1) => {
    const edgeX = cx + side * (widthAt(depthS) / 2) * TABLE_HALF_WIDTH_U;
    const room = side > 0 ? width - HUD_SIDE_PAD - edgeX : edgeX - HUD_SIDE_PAD;
    const fitScale = (room - ALTAR_TABLE_GAP) / (ALTAR_HALF_WIDTH * 2);
    const scale = clamp(Math.min(unit, fitScale), ALTAR_MIN_SCALE, unit);
    const halfWidth = ALTAR_HALF_WIDTH * scale;
    return { scale, point: { x: edgeX + side * (ALTAR_TABLE_GAP + halfWidth), y: yAt(depthS) } };
  };
  const opponentAltar = altar(ALTAR_DEPTH_S.opponent, 1);
  const myAltar = altar(ALTAR_DEPTH_S.me, -1);
  const nexusScale = Math.min(opponentAltar.scale, myAltar.scale);

  return {
    width,
    height,
    portrait,
    cx,
    yNear,
    yFar,
    wNear,
    wFar,
    tableQuad: [project(0, -TABLE_HALF_WIDTH_U), project(0, TABLE_HALF_WIDTH_U), project(1, TABLE_HALF_WIDTH_U), project(1, -TABLE_HALF_WIDTH_U)],
    tableThickness,
    unit,
    project,
    widthAt,
    slot,
    cardPlacement,
    riftBand: RIFT_BAND_S,
    nexus: {
      opponent: portrait ? project(1.0, -0.78) : opponentAltar.point,
      me: portrait ? project(0.0, 0.78) : myAltar.point,
      scale: nexusScale,
    },
    riftY,
    riftEdge,
  };
}

/** Maps a (player, rowType) pair onto a projection row. */
export function rowKeyFor(isLocal: boolean, kind: "waiting" | "active"): ArenaRowKey {
  if (isLocal) return kind === "active" ? "meActive" : "meWaiting";
  return kind === "active" ? "oppActive" : "oppWaiting";
}
