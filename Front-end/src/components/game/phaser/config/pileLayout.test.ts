import { describe, expect, it } from "vitest";
import { CARD_RATIO } from "../../zones/handLayout";
import { NEXUS_CORE_RADIUS, createArenaProjection } from "./arenaProjection";
import { PILE_IDS, PILE_LIMITS, RAIL, pileLayout, railLeftEdge, type PileLayout, type PileRect } from "./pileLayout";

const SCREENS: Array<[number, number]> = [
  [1024, 640], [1100, 700], [1152, 648], [1280, 720], [1280, 800], [1366, 768], [1440, 900], [1536, 864],
  [1600, 900], [1680, 1050], [1920, 1080], [2048, 1152], [2560, 1440]
];

/** The box of `.arena-grid` in the box of the table: 18 px in from the left, below the opponent's hand dock, above yours. */
function gridZone(width: number, height: number) {
  const dock = height > 820 ? 110 : 80;
  const margin = 8 + dock + 7;
  return { left: 18, top: margin, bottom: height - margin };
}

/** The camera the arena starts with (`useGameStore`), and the other presets. */
const CAMERA = { tilt: 0.24, zoom: 1 };

/** The column as the scene builds it, from the real projection. */
function build(width: number, height: number, camera = CAMERA) {
  const proj = createArenaProjection(width, height, camera.tilt, camera.zoom);
  const zone = gridZone(width, height);
  const ringLeft = proj.nexus.me.x - NEXUS_CORE_RADIUS * proj.nexus.scale - 6;
  const railLeft = railLeftEdge(proj.riftEdge.left, proj.riftEdge.slope, width);
  // The far edge and the bottom of the slab, as the scene hands them over.
  const table = { top: proj.tableQuad[3].y, bottom: proj.tableQuad[0].y + proj.tableThickness };
  const layout = pileLayout({ zone, table, keepClearLeft: [railLeft, ringLeft] });
  return { proj, zone, table, railLeft, ringLeft, layout };
}

const right = (rect: PileRect) => rect.x + rect.width;
const bottom = (rect: PileRect) => rect.y + rect.height;
const overlap = (a: PileRect, b: PileRect) => a.x < right(b) && b.x < right(a) && a.y < bottom(b) && b.y < bottom(a);
const slotsOf = (layout: PileLayout) => PILE_IDS.map((id) => layout.slots[id]);

describe.each(SCREENS)("pile column at %i x %i", (width, height) => {
  const { zone, table, railLeft, ringLeft, layout } = build(width, height);

  it("keeps every pile between the menu and the bottom of the table, at the left of the arena", () => {
    for (const slot of slotsOf(layout)) {
      expect(slot.x).toBeGreaterThanOrEqual(zone.left);
      expect(slot.y).toBeGreaterThanOrEqual(PILE_LIMITS.topClear);
      expect(bottom(slot)).toBeLessThanOrEqual(table.bottom);
    }
  });

  it("puts the player's graveyard level with the bottom of the table, the opponent's with its far edge", () => {
    expect(Math.abs(bottom(layout.plates.viewer) - table.bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(layout.plates.opponent.y - Math.max(table.top, PILE_LIMITS.topClear))).toBeLessThanOrEqual(2);
  });

  it("never lets two piles touch", () => {
    const slots = slotsOf(layout);
    slots.forEach((a, i) => slots.slice(i + 1).forEach((b) => expect(overlap(a, b)).toBe(false)));
  });

  it("is mirrored about the middle of the table: each player's piles against their own end of it, the middle left open", () => {
    const fromTop = layout.plates.opponent.y - table.top;
    const fromBottom = table.bottom - bottom(layout.plates.viewer);
    expect(Math.abs(fromTop - fromBottom)).toBeLessThanOrEqual(2);
    expect(layout.plates.opponent.height).toBe(layout.plates.viewer.height);
    // The open strip between the two plates is at least half a card tall, wherever the screen is large enough for it.
    if (height >= 720) expect(layout.plates.viewer.y - bottom(layout.plates.opponent)).toBeGreaterThanOrEqual(layout.cardHeight * 0.5);
    expect(layout.slots.opponentGraveyard.y).toBeLessThan(layout.slots.opponentDeck.y);
    expect(layout.slots.viewerGraveyard.y).toBeGreaterThan(layout.slots.viewerDeck.y);
  });

  it("gives each player a plate round their two piles, with an open strip between the two plates", () => {
    const { plates, slots, divider } = layout;
    const pad = PILE_LIMITS.platePad;
    expect(plates.opponent.y).toBe(slots.opponentGraveyard.y - pad);
    expect(bottom(plates.opponent)).toBe(bottom(slots.opponentDeck) + pad);
    expect(plates.viewer.y).toBe(slots.viewerDeck.y - pad);
    expect(bottom(plates.viewer)).toBe(bottom(slots.viewerGraveyard) + pad);
    expect(plates.viewer.y - bottom(plates.opponent)).toBeGreaterThanOrEqual(20);
    expect(bottom(plates.opponent)).toBeLessThan(divider);
    expect(plates.viewer.y).toBeGreaterThan(divider);
    expect(plates.opponent.x).toBeGreaterThanOrEqual(zone.left);
    expect(plates.opponent.y).toBeGreaterThanOrEqual(PILE_LIMITS.topClear);
    expect(bottom(plates.viewer)).toBeLessThanOrEqual(table.bottom);
  });

  it("is a column of cards of the hand's ratio, square cornered by being plain rectangles of whole pixels", () => {
    expect(layout.cardHeight).toBe(Math.round(layout.cardWidth * CARD_RATIO));
    for (const slot of slotsOf(layout)) {
      expect(slot.width).toBe(layout.cardWidth);
      expect(slot.height).toBe(layout.cardHeight);
      expect(Number.isInteger(slot.x) && Number.isInteger(slot.y)).toBe(true);
      expect(slot.x).toBe(layout.slots.opponentDeck.x);
    }
  });

  it("is sized for the screen, between a readable minimum and the maximum", () => {
    expect(layout.cardWidth).toBeGreaterThanOrEqual(PILE_LIMITS.minWidth);
    expect(layout.cardWidth).toBeLessThanOrEqual(PILE_LIMITS.maxWidth);
  });

  it("stands clear of the Turn Rail and of the Nexus of the viewer", () => {
    const edge = right(layout.slots.opponentDeck);
    expect(edge + PILE_LIMITS.clearance).toBeLessThanOrEqual(railLeft);
    expect(edge + PILE_LIMITS.clearance).toBeLessThanOrEqual(ringLeft);
  });
});

/** Nothing in the game changes the camera yet, so the other presets only have to hold the column in place. */
describe("the other camera presets", () => {
  it.each([
    ["top-down", { tilt: 0, zoom: 1 }],
    ["cinematic", { tilt: 0.4, zoom: 1.1 }]
  ])("keep the column inside the zone, and clear of the rail where there is room for it (%s)", (_name, camera) => {
    for (const [width, height] of SCREENS) {
      const { zone, table, railLeft, ringLeft, layout } = build(width, height, camera);
      for (const slot of slotsOf(layout)) {
        expect(slot.x).toBeGreaterThanOrEqual(zone.left);
        expect(slot.y).toBeGreaterThanOrEqual(PILE_LIMITS.topClear);
        expect(bottom(slot)).toBeLessThanOrEqual(table.bottom);
      }
      expect(layout.cardWidth).toBeGreaterThanOrEqual(PILE_LIMITS.minWidth);
      // Below 1100 px the room beside the rail can be narrower than the narrowest pile.
      if (width >= 1100) {
        expect(right(layout.slots.opponentDeck) + PILE_LIMITS.clearance).toBeLessThanOrEqual(Math.min(railLeft, ringLeft));
      }
    }
  });
});

describe("pileLayout", () => {
  const zone = { left: 18, top: 100, bottom: 700 };

  it("gives the two players the same size and stands each against its end of the zone", () => {
    const layout = pileLayout({ zone, keepClearLeft: [900] });
    expect(layout.slots.opponentGraveyard.y).toBeGreaterThanOrEqual(zone.top);
    expect(bottom(layout.slots.viewerGraveyard)).toBeLessThanOrEqual(zone.bottom);
    expect(layout.slots.viewerGraveyard.height).toBe(layout.slots.opponentGraveyard.height);
  });

  it("shrinks the piles to stay clear of an obstacle close to the left edge", () => {
    const open = pileLayout({ zone, keepClearLeft: [900] });
    const tight = pileLayout({ zone, keepClearLeft: [100] });

    expect(tight.cardWidth).toBeLessThan(open.cardWidth);
    expect(right(tight.slots.viewerDeck) + PILE_LIMITS.clearance).toBeLessThanOrEqual(100);
  });

  it("stops at the minimum width instead of vanishing when there is no room at all", () => {
    const layout = pileLayout({ zone, keepClearLeft: [20] });

    expect(layout.cardWidth).toBe(PILE_LIMITS.minWidth);
    expect(layout.slots.viewerDeck.x).toBeGreaterThanOrEqual(zone.left);
  });

  it("sits against the left of the zone when nothing is in the way", () => {
    expect(pileLayout({ zone, keepClearLeft: [] }).slots.opponentDeck.x).toBe(zone.left + PILE_LIMITS.platePad);
  });
});

describe("railLeftEdge", () => {
  // What the browser measured for the box of `.turn-rail` (trial, projection of each size): 199, 147 and 89 px.
  it.each([
    [1600, 365.6, 0.3478, 199],
    [1280, 292.5, 0.3478, 147],
    [1024, 234, 0.3478, 89]
  ])("is at most 4 px off the measured rail at %i px wide, and never to the right of it", (width, tableLeft, slope, measured) => {
    const edge = railLeftEdge(tableLeft, slope, width);
    expect(edge).toBeLessThanOrEqual(measured);
    expect(measured - edge).toBeLessThanOrEqual(4);
  });

  it("follows the width of the rail, which is capped", () => {
    expect(railLeftEdge(500, 0, 5000)).toBe(500 - RAIL.gap - RAIL.maxWidth);
    expect(railLeftEdge(500, 0, 200)).toBe(500 - RAIL.gap - RAIL.minWidth);
  });
});
