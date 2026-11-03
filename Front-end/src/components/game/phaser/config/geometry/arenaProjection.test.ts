import { describe, expect, it } from "vitest";
import { ARENA_COLUMNS, NEXUS_CORE_RADIUS, createArenaProjection, type ArenaRowKey } from "./arenaProjection";

const ROWS: ArenaRowKey[] = ["meWaiting", "meActive", "oppActive", "oppWaiting"];
const VIEWPORTS: Array<[number, number]> = [
  [1920, 1080],
  [1366, 768],
  [2560, 1080],
  [1280, 720],
];

describe("createArenaProjection", () => {
  it.each(VIEWPORTS)("keeps the slab between the hand docks at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    const slabTop = proj.yFar;
    const slabBottom = proj.yNear + proj.tableThickness;
    expect(slabTop).toBeGreaterThanOrEqual(height * 0.1);
    expect(slabBottom).toBeLessThanOrEqual(height * 0.9);
    // Centred in the band, so the gaps above and below stay of the same order.
    expect(Math.abs(slabTop - (height - slabBottom))).toBeLessThan(height * 0.1);
  });

  it.each(VIEWPORTS)("puts all 24 lanes inside the table at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    ROWS.forEach((row) => {
      for (let column = 0; column < ARENA_COLUMNS; column += 1) {
        proj.slot(row, column).quad.forEach((p) => {
          const half = proj.widthAt(0) / 2;
          expect(p.y).toBeGreaterThanOrEqual(proj.yFar);
          expect(p.y).toBeLessThanOrEqual(proj.yNear);
          expect(Math.abs(p.x - proj.cx)).toBeLessThanOrEqual(half);
        });
      }
    });
  });

  it("lays the rows out from the player's edge to the opponent's without overlap", () => {
    const proj = createArenaProjection(1920, 1080, 0.24, 1);
    const centres = ROWS.map((row) => proj.slot(row, 0).center.y);
    // Screen y grows downwards: the player's rows are the lowest ones.
    expect(centres).toEqual([...centres].sort((a, b) => b - a));
    ROWS.slice(0, -1).forEach((row, index) => {
      const near = proj.slot(row, 0).quad;
      const far = proj.slot(ROWS[index + 1], 0).quad;
      expect(near[3].y).toBeGreaterThanOrEqual(far[0].y);
    });
  });

  it("makes a lane almost as big as a hand card", () => {
    const proj = createArenaProjection(1920, 1080, 0.24, 1);
    const slot = proj.slot("meActive", 0);
    expect(slot.width).toBeGreaterThan(120);
    expect(slot.depth).toBeGreaterThan(120);
  });

  it.each(VIEWPORTS)("keeps near and far lanes the same shape at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    const aspect = (row: ArenaRowKey) => {
      const slot = proj.slot(row, 2);
      return slot.depth / slot.width;
    };
    // The far lanes must not turn into tall slivers (the opponent's lanes are not longer).
    expect(Math.abs(aspect("oppWaiting") - aspect("meWaiting"))).toBeLessThan(0.25);
    expect(aspect("oppActive")).toBeLessThanOrEqual(aspect("meActive") + 0.05);
    // The row depths shrink faster than the widths, as in the concept (≈ 1.86 vs 1.4–1.7).
    const depthRatio = proj.slot("meWaiting", 0).depth / proj.slot("oppWaiting", 0).depth;
    const widthRatio = proj.slot("meWaiting", 0).width / proj.slot("oppWaiting", 0).width;
    expect(depthRatio).toBeGreaterThan(widthRatio);
    expect(depthRatio).toBeGreaterThan(1.4);
    expect(depthRatio).toBeLessThan(2.4);
  });

  it("keeps the rift narrow so the lanes can be large", () => {
    const proj = createArenaProjection(1920, 1080, 0.24, 1);
    const near = proj.slot("meActive", 0);
    const far = proj.slot("oppActive", 0);
    const rift = near.quad[3].y - far.quad[0].y;
    expect(rift).toBeGreaterThan(0);
    expect(rift).toBeLessThan(near.depth * 0.45);
  });

  it("fills the whole lane with the card and stands it up about its near edge", () => {
    const proj = createArenaProjection(1920, 1080, 0.24, 1);
    const slot = proj.slot("oppActive", 2);
    const placement = proj.cardPlacement(slot);
    expect(placement.quad).toEqual(slot.quad);
    expect(placement.liftedQuad(0)).toEqual(slot.quad);

    const [nl, nr, fr, fl] = placement.quad;
    const [lnl, lnr, lfr, lfl] = placement.liftedQuad(placement.standDegrees);
    expect(lnl).toEqual(nl);
    expect(lnr).toEqual(nr);
    // The far edge rises on screen and, being closer to the camera, gets wider.
    expect(lfr.y).toBeLessThan(fr.y);
    expect(lfl.y).toBeLessThan(fl.y);
    expect(lfr.x - lfl.x).toBeGreaterThan(fr.x - fl.x);
  });

  it.each(VIEWPORTS)("stands the card up with the proportions of a hand card at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    ROWS.forEach((row) => {
      const placement = proj.cardPlacement(proj.slot(row, 1));
      const [nl, nr, fr, fl] = placement.liftedQuad(placement.standDegrees);
      const meanWidth = (nr.x - nl.x + (fr.x - fl.x)) / 2;
      const aspect = (nl.y - fl.y) / meanWidth;
      // A hand card is 1 : 1.4; the camera foreshortens it a little.
      expect(aspect).toBeGreaterThan(1.25);
      expect(aspect).toBeLessThan(1.6);
    });
  });

  it.each(VIEWPORTS)("stands the altars beside the table, not on it, at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    const ringHalfWidth = NEXUS_CORE_RADIUS * proj.nexus.scale;
    const opponent = proj.nexus.opponent;
    const me = proj.nexus.me;
    // Table edges at the altar's own height (the edge slants, so test the nearer corner).
    const edgeAt = (y: number) => {
      const t = (proj.yNear - y) / (proj.yNear - proj.yFar);
      return (proj.wNear + (proj.wFar - proj.wNear) * t) / 2;
    };
    expect(opponent.x - ringHalfWidth).toBeGreaterThan(proj.cx + edgeAt(opponent.y));
    expect(me.x + ringHalfWidth).toBeLessThan(proj.cx - edgeAt(me.y));
  });

  it.each(VIEWPORTS)("keeps both Nexus rings the same distance from the drawn slab edge at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    const radius = NEXUS_CORE_RADIUS * proj.nexus.scale;
    // The slab is drawn with straight edges between its corners.
    const [nearLeft, , , farLeft] = proj.tableQuad;
    const leftEdgeAt = (y: number) => nearLeft.x + ((nearLeft.y - y) / (nearLeft.y - farLeft.y)) * (farLeft.x - nearLeft.x);
    const rightEdgeAt = (y: number) => 2 * proj.cx - leftEdgeAt(y);
    const opponentGap = proj.nexus.opponent.x - radius - rightEdgeAt(proj.nexus.opponent.y);
    const myGap = leftEdgeAt(proj.nexus.me.y) - (proj.nexus.me.x + radius);
    expect(opponentGap).toBeGreaterThan(0);
    expect(opponentGap).toBeCloseTo(myGap, 5);
  });

  it.each(VIEWPORTS)("reports the left table edge at the rift at %ix%i", (width, height) => {
    const proj = createArenaProjection(width, height, 0.24, 1);
    const { left, slope } = proj.riftEdge;
    // The far edge is narrower, so the left edge leans towards the centre as it climbs.
    expect(slope).toBeGreaterThan(0);
    // It sits between the near and far corners, on the line the table is drawn with.
    const [nearLeft, , , farLeft] = proj.tableQuad;
    expect(left).toBeGreaterThan(nearLeft.x);
    expect(left).toBeLessThan(farLeft.x);
    expect(left).toBeCloseTo(nearLeft.x + slope * (nearLeft.y - proj.riftY), 5);
  });
});
