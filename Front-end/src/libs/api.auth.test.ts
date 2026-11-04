import { afterEach, describe, expect, it, vi } from "vitest";
import { isAuthError, isServerUnavailable, login, me } from "./api";
import { resetSessionReplacement, sessionReplacement } from "./session/sessionEvents";

// The API base URL is read when the module loads.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_API_URL = "https://api.test";
});

const answer = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe("API error classification", () => {
  const withStatus = (status: number) => Object.assign(new Error("x"), { status });

  it("treats only 401 and 403 as a rejected session", () => {
    expect(isAuthError(withStatus(401))).toBe(true);
    expect(isAuthError(withStatus(403))).toBe(true);
    expect(isAuthError(withStatus(500))).toBe(false);
    expect(isAuthError(new Error("no status"))).toBe(false);
  });

  it("treats a 5xx answer or an unreachable server as unavailable, not as a session problem", () => {
    expect(isServerUnavailable(withStatus(500))).toBe(true);
    expect(isServerUnavailable(withStatus(503))).toBe(true);
    expect(isServerUnavailable(new TypeError("Failed to fetch"))).toBe(true);
    expect(isServerUnavailable(withStatus(400))).toBe(false);
    expect(isServerUnavailable(withStatus(401))).toBe(false);
  });
});

describe("login", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const tokens = { success: true, accessToken: "a", idToken: "i", refreshToken: "r", expiresIn: 3600 };

  it("tries once more when the server fails while starting up", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockImplementationOnce(() => answer(500, { message: "Internal Server Error" }))
      .mockImplementationOnce(() => answer(200, tokens));
    vi.stubGlobal("fetch", fetchMock);

    const result = login("a@b.c", "pw");
    await vi.runAllTimersAsync();

    await expect(result).resolves.toMatchObject({ accessToken: "a" });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("explains a server that is still unavailable after the second try", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn(() => answer(500, { message: "Internal Server Error" })));

    const result = login("a@b.c", "pw");
    const assertion = expect(result).rejects.toThrow("The server is starting up");
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("does not retry a wrong password", async () => {
    const fetchMock = vi.fn(() => answer(400, { message: "Invalid email or password." }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(login("a@b.c", "pw")).rejects.toThrow("Invalid email or password.");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("a session ended by a sign-in elsewhere", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resetSessionReplacement();
  });

  it("is reported when the API answers 401 SESSION_REPLACED", async () => {
    vi.stubGlobal("fetch", vi.fn(() => answer(401, { code: "SESSION_REPLACED", message: "Signed in elsewhere." })));

    await expect(me()).rejects.toMatchObject({ code: "SESSION_REPLACED", status: 401 });
    expect(sessionReplacement()).toBe("device");
  });

  it("is not reported for an ordinary 401 (an expired token is refreshed, not a replaced session)", async () => {
    vi.stubGlobal("fetch", vi.fn(() => answer(401, { message: "JWT expired" })));

    await expect(me()).rejects.toMatchObject({ status: 401 });
    expect(sessionReplacement()).toBeUndefined();
  });
});

