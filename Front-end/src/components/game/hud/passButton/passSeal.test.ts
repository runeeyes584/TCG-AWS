import { describe, expect, it } from "vitest";
import { PASS_SEAL_TONES, fitSealText, passSealStyle, sealPlacement, type PassSealState } from "./passSeal";

const base: PassSealState = {
  mode: "idle",
  label: "PASS",
  enabled: true,
  urgency: "calm",
  hover: false,
  pressed: false
};

describe("passSealStyle", () => {
  it("greys out and stops pulsing while the player has to wait", () => {
    const style = passSealStyle({ ...base, enabled: false, urgency: "critical", hover: true });
    expect(style.tone).toBe(PASS_SEAL_TONES.waiting);
    expect(style.orbit).toBe(false);
    expect(style.pulse).toBe(0);
    expect(style.scale).toBe(1);
    expect(style.alpha).toBeLessThan(1);
  });

  it("gives each mode its own tone", () => {
    expect(passSealStyle(base).tone).toBe(PASS_SEAL_TONES.idle);
    expect(passSealStyle({ ...base, mode: "attack" }).tone).toBe(PASS_SEAL_TONES.attack);
    expect(passSealStyle({ ...base, mode: "defend" }).tone).toBe(PASS_SEAL_TONES.defend);
  });

  it("orbits only for states that commit combat, or when the clock runs out", () => {
    expect(passSealStyle(base).orbit).toBe(false);
    expect(passSealStyle({ ...base, mode: "attack" }).orbit).toBe(true);
    expect(passSealStyle({ ...base, mode: "defend" }).orbit).toBe(true);
    expect(passSealStyle({ ...base, urgency: "warn" }).orbit).toBe(true);
  });

  it("beats harder as the clock runs out and lets an idle seal take the clock's colour", () => {
    const calm = passSealStyle(base);
    const warn = passSealStyle({ ...base, urgency: "warn" });
    const critical = passSealStyle({ ...base, urgency: "critical" });
    expect(calm.pulse).toBe(0);
    expect(warn.pulse).toBeGreaterThan(0);
    expect(critical.pulse).toBeGreaterThan(warn.pulse);
    expect(warn.tone).toBe(PASS_SEAL_TONES.warn);
    expect(critical.tone).toBe(PASS_SEAL_TONES.critical);
    // Attack keeps its own tone but still beats.
    const attack = passSealStyle({ ...base, mode: "attack", urgency: "critical" });
    expect(attack.tone).toBe(PASS_SEAL_TONES.attack);
    expect(attack.pulse).toBe(critical.pulse);
  });

  it("lifts on hover and sinks on press", () => {
    expect(passSealStyle({ ...base, hover: true }).scale).toBeGreaterThan(1);
    expect(passSealStyle({ ...base, hover: true, pressed: true }).scale).toBeLessThan(1);
    expect(passSealStyle({ ...base, hover: true }).glow).toBeGreaterThan(passSealStyle(base).glow);
  });
});

describe("sealPlacement", () => {
  it("maps a DOM rect onto the canvas, centred", () => {
    const placed = sealPlacement(
      { x: 1700, y: 600, width: 128, height: 128 },
      { x: 0, y: 0, width: 1920, height: 1080 },
      { width: 1920, height: 1080 }
    );
    expect(placed).toEqual({ x: 1764, y: 664, radius: 64 });
  });

  it("follows the canvas offset and its scale", () => {
    const placed = sealPlacement(
      { x: 1000, y: 400, width: 100, height: 100 },
      { x: 100, y: 50, width: 1000, height: 500 },
      { width: 2000, height: 1000 }
    );
    expect(placed).toEqual({ x: 1900, y: 800, radius: 100 });
  });
});

describe("fitSealText", () => {
  it("keeps short text and cuts long names", () => {
    expect(fitSealText("No attack", 12)).toBe("No attack");
    expect(fitSealText("Moonlit_Ghost_Walker", 12)).toBe("Moonlit_Gho…");
    expect(fitSealText(undefined, 12)).toBe("");
  });
});
