import { describe, expect, it } from "vitest";
import { NEXUS_SEGMENTS, changedSegments, nexusCoreStyle, segmentArc } from "./nexusCore";

describe("nexusCoreStyle", () => {
  it("lights one segment per HP, clamped to the ring", () => {
    expect(nexusCoreStyle(20, "viewer").lit).toBe(20);
    expect(nexusCoreStyle(14, "opponent").lit).toBe(14);
    expect(nexusCoreStyle(-3, "viewer").lit).toBe(0);
    expect(nexusCoreStyle(35, "viewer").lit).toBe(NEXUS_SEGMENTS);
  });

  it("cracks at 11 HP and turns critical at 5", () => {
    expect(nexusCoreStyle(12, "viewer")).toMatchObject({ cracked: false, critical: false });
    expect(nexusCoreStyle(11, "viewer")).toMatchObject({ cracked: true, critical: false });
    expect(nexusCoreStyle(6, "viewer")).toMatchObject({ cracked: true, critical: false });
    expect(nexusCoreStyle(5, "viewer")).toMatchObject({ cracked: true, critical: true });
  });

  it("tints each side, and turns a dying core red for both", () => {
    expect(nexusCoreStyle(20, "viewer").tone).not.toBe(nexusCoreStyle(20, "opponent").tone);
    expect(nexusCoreStyle(3, "viewer").tone).toBe(nexusCoreStyle(3, "opponent").tone);
  });
});

describe("changedSegments", () => {
  it("lists the segments that went dark, or lit", () => {
    expect(changedSegments(20, 17)).toEqual({ kind: "lost", segments: [17, 18, 19] });
    expect(changedSegments(14, 16)).toEqual({ kind: "gained", segments: [14, 15] });
    expect(changedSegments(9, 9)).toEqual({ kind: "none", segments: [] });
  });
});

describe("segmentArc", () => {
  it("splits the ring into twenty arcs that do not overlap", () => {
    const arcs = Array.from({ length: NEXUS_SEGMENTS }, (_, i) => segmentArc(i));
    arcs.forEach((arc, i) => {
      expect(arc.end).toBeGreaterThan(arc.start);
      if (i > 0) expect(arc.start).toBeGreaterThan(arcs[i - 1].end);
    });
    expect(arcs[NEXUS_SEGMENTS - 1].end).toBeLessThan(arcs[0].start + Math.PI * 2);
  });
});
