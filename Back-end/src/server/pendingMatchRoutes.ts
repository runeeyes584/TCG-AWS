import express, { type Express, type RequestHandler, type Router } from "express";
import type { PlayerId } from "../game/types";

/**
 * The unfinished-match endpoints of the local Socket.IO server (`server/index.ts`). That server keeps matches in
 * memory, so these answer from memory; in AWS the same paths are served from DynamoDB by `http/matches.routes.ts`.
 */

interface PendingPlayer {
  readonly userId: string;
  readonly playerId: PlayerId;
  readonly connected: boolean;
}

export interface PendingRoom {
  readonly code: string;
  readonly players: readonly PendingPlayer[];
  readonly state: { readonly started: boolean };
}

export interface PendingMatchDeps<Room extends PendingRoom> {
  readonly authenticate: RequestHandler;
  /** A started match the user left (their socket is gone) and may still resume or forfeit. */
  readonly findPendingRoomForUser: (userId: string) => Room | undefined;
  /** A room the user created that nobody has joined yet. */
  readonly findWaitingRoomOwnedBy: (userId: string) => Room | undefined;
  readonly forfeitPlayer: (room: Room, playerId: PlayerId, reason: string) => Promise<void>;
  readonly removeRoom: (roomCode: string) => void;
}

const authenticatedUserId = (req: express.Request): string | undefined => {
  const userId = (req as { user?: { sub?: unknown } }).user?.sub;
  return typeof userId === "string" ? userId : undefined;
};

/** Mounted at `/matches/pending`. */
export function createPendingMatchRouter<Room extends PendingRoom>(deps: PendingMatchDeps<Room>): Router {
  const router = express.Router();

  router.get("/", deps.authenticate, (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const room = deps.findPendingRoomForUser(userId);
    const player = room?.players.find((candidate) => candidate.userId === userId);
    const opponent = room?.players.find((candidate) => candidate.userId !== userId);
    return res.json({
      success: true,
      match: room && player ? {
        roomCode: room.code,
        status: room.state.started ? "IN_PROGRESS" : "WAITING",
        playerId: player.playerId,
        opponentConnected: opponent?.connected !== false
      } : null
    });
  });

  router.post("/forfeit", deps.authenticate, async (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const room = deps.findPendingRoomForUser(userId);
    const player = room?.players.find((candidate) => candidate.userId === userId);
    if (!room || !player) return res.status(404).json({ success: false, message: "No active match found." });

    await deps.forfeitPlayer(room, player.playerId, "left the match from the lobby.");
    return res.json({ success: true });
  });

  // Mirrors the production endpoint used by /room-create. A room that has not started is not a match and is
  // removed without awarding a win or a loss.
  router.post("/cancel", deps.authenticate, (req, res) => {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const room = deps.findWaitingRoomOwnedBy(userId);
    if (!room) return res.status(404).json({ success: false, message: "No waiting room was found." });

    deps.removeRoom(room.code);
    return res.json({ success: true, message: "Waiting room cancelled." });
  });

  return router;
}

/**
 * Mounts the match routes. The in-memory `/matches/pending` endpoints must come first: the general matches router
 * (match history, DynamoDB) has the same paths and, mounted first, would answer from DynamoDB, where a match played
 * on the local server does not exist, so the "continue match" prompt would never appear.
 */
export function mountMatchRoutes(app: Express, pending: Router, matches: Router): void {
  app.use("/matches/pending", pending);
  app.use("/matches", matches);
}
