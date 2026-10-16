import { describe, expect, it } from "vitest";
import { BANNER_COOLDOWN_MS, nextAnnouncement, type AnnouncementInput } from "./turnAnnouncement";

const input = (over: Partial<AnnouncementInput> = {}): AnnouncementInput => ({
  turn: 1,
  owner: "you",
  started: true,
  over: false,
  ...over
});

describe("nextAnnouncement", () => {
  it("announces nothing before the match starts or after it is over", () => {
    expect(nextAnnouncement(undefined, input({ started: false }), 0).mode).toBeNull();
    expect(nextAnnouncement(undefined, input({ over: true }), 0).mode).toBeNull();
  });

  it("gives the first turn of a started match the full banner", () => {
    const first = nextAnnouncement(undefined, input(), 1000);
    expect(first.mode).toBe("full");
    expect(first.state).toEqual({ key: "1:you", announcedAt: 1000 });
  });

  it("stays quiet while the same player holds the same turn", () => {
    const first = nextAnnouncement(undefined, input(), 0);
    expect(nextAnnouncement(first.state, input(), 500).mode).toBeNull();
  });

  it("gives a change after a quiet spell the full banner", () => {
    const first = nextAnnouncement(undefined, input(), 0);
    const next = nextAnnouncement(first.state, input({ turn: 2, owner: "opponent" }), BANNER_COOLDOWN_MS + 1);
    expect(next.mode).toBe("full");
    expect(next.state?.key).toBe("2:opponent");
  });

  it("only flashes the rift when turns change in quick succession", () => {
    const first = nextAnnouncement(undefined, input(), 0);
    const quick = nextAnnouncement(first.state, input({ turn: 2, owner: "opponent" }), 800);
    expect(quick.mode).toBe("flash");
    // The cooldown runs from the last full banner, so a long chain of passes still shows one.
    const later = nextAnnouncement(quick.state, input({ turn: 3, owner: "you" }), BANNER_COOLDOWN_MS + 100);
    expect(later.mode).toBe("full");
  });

  it("treats the same owner on a new turn as a change", () => {
    const first = nextAnnouncement(undefined, input(), 0);
    expect(nextAnnouncement(first.state, input({ turn: 2 }), 100).mode).toBe("flash");
  });
});
