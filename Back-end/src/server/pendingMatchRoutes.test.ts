import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import express, { type RequestHandler } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPendingMatchRouter, mountMatchRoutes, type PendingRoom } from "./pendingMatchRoutes";

const USER = "user-1";

/** Stands in for `authenticate`: the token is the user id, so the tests need no real Cognito token. */
const authenticate: RequestHandler = (req, res, next) => {
  const token = req.header("authorization")?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized." });
  (req as { user?: unknown }).user = { sub: token };
  next();
};

const room = (overrides: Partial<PendingRoom> = {}): PendingRoom => ({
  code: "ABC234",
  state: { started: true },
  players: [
    { userId: USER, playerId: "P1", connected: false },
    { userId: "opponent", playerId: "P2", connected: true }
  ],
  ...overrides
});

describe("local unfinished-match routes", () => {
  let server: Server;
  let base: string;
  let pendingRoom: PendingRoom | undefined;
  let waitingRoom: PendingRoom | undefined;
  const forfeitPlayer = vi.fn(async () => undefined);
  const removeRoom = vi.fn();
  /** The production router (DynamoDB), which has the same `/pending` paths and knows nothing of local matches. */
  const productionPending = vi.fn((_req: express.Request, res: express.Response) => res.json({ success: true, match: null }));

  beforeEach(async () => {
    pendingRoom = undefined;
    waitingRoom = undefined;
    forfeitPlayer.mockClear();
    removeRoom.mockClear();
    productionPending.mockClear();

    const production = express.Router();
    production.get("/pending", productionPending);
    production.get("/history", (_req, res) => res.json({ success: true, history: ["from-dynamodb"] }));

    const app = express();
    mountMatchRoutes(app, createPendingMatchRouter({
      authenticate,
      findPendingRoomForUser: () => pendingRoom,
      findWaitingRoomOwnedBy: () => waitingRoom,
      forfeitPlayer,
      removeRoom
    }), production);

    server = app.listen(0);
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  const call = (method: string, path: string, user: string | null = USER) =>
    fetch(`${base}${path}`, { method, headers: user ? { authorization: `Bearer ${user}` } : {} })
      .then(async (response) => ({ status: response.status, body: await response.json() as any }));

  it("reports the match the player left, so the continue-match prompt can appear", async () => {
    pendingRoom = room();

    const { status, body } = await call("GET", "/matches/pending");

    expect(status).toBe(200);
    expect(body.match).toEqual({ roomCode: "ABC234", status: "IN_PROGRESS", playerId: "P1", opponentConnected: true });
  });

  it("answers from memory, not from the DynamoDB router that shares the path", async () => {
    pendingRoom = room();

    await call("GET", "/matches/pending");

    expect(productionPending).not.toHaveBeenCalled();
  });

  it("reports no match when the player has none", async () => {
    const { body } = await call("GET", "/matches/pending");

    expect(body).toEqual({ success: true, match: null });
  });

  it("tells the continue prompt when the opponent has left too", async () => {
    pendingRoom = room({
      players: [
        { userId: USER, playerId: "P2", connected: false },
        { userId: "opponent", playerId: "P1", connected: false }
      ]
    });

    const { body } = await call("GET", "/matches/pending");

    expect(body.match).toMatchObject({ playerId: "P2", opponentConnected: false });
  });

  it("still serves the rest of the matches router (history)", async () => {
    const { body } = await call("GET", "/matches/history");

    expect(body.history).toEqual(["from-dynamodb"]);
  });

  it("rejects a request without a user", async () => {
    expect((await call("GET", "/matches/pending", null)).status).toBe(401);
    expect((await call("POST", "/matches/pending/forfeit", null)).status).toBe(401);
    expect((await call("POST", "/matches/pending/cancel", null)).status).toBe(401);
  });

  it("forfeits the player's own side of the match they left", async () => {
    pendingRoom = room();

    const { status } = await call("POST", "/matches/pending/forfeit");

    expect(status).toBe(200);
    expect(forfeitPlayer).toHaveBeenCalledWith(pendingRoom, "P1", "left the match from the lobby.");
  });

  it("has nothing to forfeit when there is no match", async () => {
    expect((await call("POST", "/matches/pending/forfeit")).status).toBe(404);
    expect(forfeitPlayer).not.toHaveBeenCalled();
  });

  it("cancels a waiting room without a result", async () => {
    waitingRoom = room({ state: { started: false } });

    const { status } = await call("POST", "/matches/pending/cancel");

    expect(status).toBe(200);
    expect(removeRoom).toHaveBeenCalledWith("ABC234");
    expect(forfeitPlayer).not.toHaveBeenCalled();
  });

  it("has nothing to cancel when no room is waiting", async () => {
    expect((await call("POST", "/matches/pending/cancel")).status).toBe(404);
    expect(removeRoom).not.toHaveBeenCalled();
  });
});
