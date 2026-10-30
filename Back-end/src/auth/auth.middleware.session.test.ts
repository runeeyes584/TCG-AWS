import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyToken, send } = vi.hoisted(() => ({ verifyToken: vi.fn(), send: vi.fn() }));
vi.mock("./verifyToken", () => ({ verifyToken }));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send } }));

import { authenticate } from "./auth.middleware";

/** A request carrying `Bearer token`, a response that records what was sent, and whether `next` was reached. */
function run(token = "token") {
  const req: any = { header: (name: string) => (name === "authorization" ? `Bearer ${token}` : undefined), cookies: {} };
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; }
  };
  const next = vi.fn();
  return authenticate(req, res, next).then(() => ({ req, res, next }));
}

describe("authenticate and the active session", () => {
  beforeEach(() => {
    verifyToken.mockReset();
    send.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("lets the active session through", async () => {
    verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "new" });
    send.mockResolvedValue({ Item: { active_session: "new" } });

    const { next, req } = await run();

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject({ sub: "user-1" });
  });

  it("refuses a session that a later sign-in replaced, with a code the client recognises", async () => {
    verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "old" });
    send.mockResolvedValue({ Item: { active_session: "new" } });

    const { next, res } = await run();

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: "SESSION_REPLACED" });
  });

  it("lets a player through whose profile has no session recorded yet", async () => {
    verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "any" });
    send.mockResolvedValue({ Item: {} });

    expect((await run()).next).toHaveBeenCalled();
  });

  it("still refuses an invalid token as before", async () => {
    verifyToken.mockRejectedValueOnce(new Error("JWT expired"));

    const { next, res } = await run();

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ message: "JWT expired" });
    expect(send).not.toHaveBeenCalled();
  });

  it("reports a failure to read the session as a server error, not as a sign-out", async () => {
    verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "new" });
    send.mockRejectedValueOnce(Object.assign(new Error("throttled"), { name: "ProvisionedThroughputExceededException" }));

    const { next, res } = await run();

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(503);
  });
});
