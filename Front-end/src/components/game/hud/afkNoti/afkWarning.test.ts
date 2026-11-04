import { describe, expect, it } from "vitest";
import { afkToastInput, afkWarningKey } from "./afkWarning";

describe("afkWarningKey", () => {
  it("tells apart two first warnings separated by a turn in which the player acted", () => {
    expect(afkWarningKey({ turnStartTime: 1_000 }, 1)).not.toBe(afkWarningKey({ turnStartTime: 91_000 }, 1));
  });

  it("is the same when the same state is received again", () => {
    expect(afkWarningKey({ turnStartTime: 1_000 }, 1)).toBe(afkWarningKey({ turnStartTime: 1_000 }, 1));
  });
});

describe("afkToastInput", () => {
  it("is a yellow warning the first time", () => {
    expect(afkToastInput(1)).toMatchObject({ tone: "warning", title: "TURN MISSED", placement: "game", duration: 8000 });
  });

  it("is red from the second time on", () => {
    for (const count of [2, 3]) {
      expect(afkToastInput(count)).toMatchObject({ tone: "danger", title: "SURRENDER IMMINENT" });
    }
  });

  it("is one toast whichever the count, so a new warning replaces the one on the screen", () => {
    expect(afkToastInput(1).key).toBe("afk");
    expect(afkToastInput(2).key).toBe(afkToastInput(1).key);
  });
});
