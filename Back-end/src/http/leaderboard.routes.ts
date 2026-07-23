import { Router } from "express";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { authenticate } from "../auth/auth.middleware";
import { dynamoDb } from "../config/dynamodb";
import {
  DEFAULT_LEADERBOARD_INDEX,
  GLOBAL_LEADERBOARD_SCOPE,
  toRankedProfile
} from "../leaderboard/leaderboard";

const router = Router();
const userProfileTable = process.env.USER_PROFILE_TABLE || "UserProfile";
const leaderboardIndex = process.env.LEADERBOARD_INDEX || DEFAULT_LEADERBOARD_INDEX;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

type Cursor = {
  user_id: string;
  leaderboard_scope: string;
  leaderboard_sort: string;
};

function authenticatedUserId(request: any): string | undefined {
  return typeof request.user?.sub === "string" ? request.user.sub : undefined;
}

function pageSize(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

function encodeCursor(key: Record<string, unknown> | undefined): string | null {
  return key ? Buffer.from(JSON.stringify(key), "utf8").toString("base64url") : null;
}

function decodeCursor(value: unknown): Cursor | undefined {
  if (typeof value !== "string" || !value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Cursor;
    if (
      typeof parsed.user_id !== "string" ||
      parsed.leaderboard_scope !== GLOBAL_LEADERBOARD_SCOPE ||
      typeof parsed.leaderboard_sort !== "string"
    ) {
      throw new Error("Invalid leaderboard cursor.");
    }
    return parsed;
  } catch {
    throw new Error("Invalid leaderboard cursor.");
  }
}

async function getCurrentPlayer(userId: string) {
  const result = await dynamoDb.send(new GetCommand({
    TableName: userProfileTable,
    Key: { user_id: userId },
    ConsistentRead: true
  }));
  return result.Item ? toRankedProfile(result.Item) : null;
}

router.get("/", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    let cursor: Cursor | undefined;
    try {
      cursor = decodeCursor(req.query.cursor);
    } catch {
      return res.status(400).json({ success: false, message: "Invalid leaderboard cursor." });
    }

    const [page, currentPlayer] = await Promise.all([
      dynamoDb.send(new QueryCommand({
        TableName: userProfileTable,
        IndexName: leaderboardIndex,
        KeyConditionExpression: "leaderboard_scope = :scope",
        ExpressionAttributeValues: { ":scope": GLOBAL_LEADERBOARD_SCOPE },
        ScanIndexForward: false,
        Limit: pageSize(req.query.limit),
        ExclusiveStartKey: cursor
      })),
      getCurrentPlayer(userId)
    ]);

    const entries = (page.Items || []).map((item) => {
      const player = toRankedProfile(item);
      return {
        ...player,
        isCurrentPlayer: player.userId === userId,
        rankPending: !player.rankUpdatedAt ||
          Boolean(player.projectedAt && player.rankUpdatedAt < player.projectedAt)
      };
    });

    return res.json({
      success: true,
      scope: GLOBAL_LEADERBOARD_SCOPE,
      entries,
      currentPlayer: currentPlayer ? {
        ...currentPlayer,
        isCurrentPlayer: true,
        rankPending: !currentPlayer.rankUpdatedAt ||
          Boolean(
            currentPlayer.projectedAt &&
            currentPlayer.rankUpdatedAt < currentPlayer.projectedAt
          )
      } : null,
      nextCursor: encodeCursor(page.LastEvaluatedKey)
    });
  } catch (error: any) {
    console.error("GET /leaderboard failed:", error);
    const missingIndex = error?.name === "ValidationException" &&
      String(error?.message || "").toLowerCase().includes("index");
    return res.status(missingIndex ? 503 : 500).json({
      success: false,
      message: missingIndex
        ? "Leaderboard index is not ready."
        : "Unable to load the leaderboard."
    });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const userId = authenticatedUserId(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    const player = await getCurrentPlayer(userId);
    return res.json({
      success: true,
      player: player ? {
        ...player,
        isCurrentPlayer: true,
        rankPending: !player.rankUpdatedAt ||
          Boolean(player.projectedAt && player.rankUpdatedAt < player.projectedAt)
      } : null
    });
  } catch (error) {
    console.error("GET /leaderboard/me failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load your rank." });
  }
});

export default router;
