import { describe, expect, it } from "vitest";
import { clockOffset, serverNow } from "./serverClock";

describe("serverClock", () => {
  it("measures a browser clock that is ahead of the server as a negative offset", () => {
    expect(clockOffset(10_000, 12_000)).toBe(-2_000);
    expect(serverNow(-2_000, 15_000)).toBe(13_000);
  });

  it("measures a browser clock that is behind the server as a positive offset", () => {
    expect(clockOffset(10_000, 8_000)).toBe(2_000);
    expect(serverNow(2_000, 15_000)).toBe(17_000);
  });

  it("assumes the clocks agree when the message carries no server time", () => {
    expect(clockOffset(undefined, 8_000)).toBe(0);
    expect(clockOffset(Number.NaN, 8_000)).toBe(0);
    expect(serverNow(undefined, 15_000)).toBe(15_000);
  });
});
