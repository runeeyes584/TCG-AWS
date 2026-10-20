import { describe, expect, it } from "vitest";
import { afkWarningKey } from "./afkWarning";

describe("afkWarningKey", () => {
  it("tells apart two first warnings separated by a turn in which the player acted", () => {
    expect(afkWarningKey({ turnStartTime: 1_000 }, 1)).not.toBe(afkWarningKey({ turnStartTime: 91_000 }, 1));
  });

  it("is the same when the same state is received again", () => {
    expect(afkWarningKey({ turnStartTime: 1_000 }, 1)).toBe(afkWarningKey({ turnStartTime: 1_000 }, 1));
  });
});
