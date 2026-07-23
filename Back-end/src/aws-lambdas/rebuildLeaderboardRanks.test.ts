import { ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  notifyConnections: vi.fn()
}));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("../leaderboard/realtime", () => ({ notifyConnections: mocks.notifyConnections }));

import { rebuildLeaderboardRanks } from "./rebuildLeaderboardRanks";

describe("rebuildLeaderboardRanks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.WS_MANAGEMENT_ENDPOINT;
  });

  it("backfills the GSI projection and assigns exact ranks in score order", async () => {
    const updates: UpdateCommand[] = [];
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ScanCommand) {
        return {
          Items: [
            {
              user_id: "high-win-rate",
              updated_at: 1,
              stats: { elo_rating: 1400, wins: 8, losses: 2 }
            },
            {
              user_id: "high-elo-low-rate",
              updated_at: 1,
              stats: { elo_rating: 1500, wins: 1, losses: 9 }
            },
            {
              user_id: "same-elo-low-rate",
              updated_at: 1,
              stats: { elo_rating: 1400, wins: 5, losses: 5 }
            }
          ]
        };
      }
      if (command instanceof UpdateCommand) {
        updates.push(command);
        return {};
      }
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await rebuildLeaderboardRanks({ action: "rebuild-global-ranks" });

    expect(result).toMatchObject({
      scope: "GLOBAL",
      playersScanned: 3,
      playersUpdated: 3,
      playersSkipped: 0,
      rankChanges: 3
    });
    expect(updates.map((command) => ({
      userId: command.input.Key?.user_id,
      rank: command.input.ExpressionAttributeValues?.[":rank"],
      scope: command.input.ExpressionAttributeValues?.[":scope"]
    }))).toEqual([
      { userId: "high-elo-low-rate", rank: 1, scope: "GLOBAL" },
      { userId: "high-win-rate", rank: 2, scope: "GLOBAL" },
      { userId: "same-elo-low-rate", rank: 3, scope: "GLOBAL" }
    ]);
  });

  it("skips a profile changed concurrently instead of overwriting its projection", async () => {
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof ScanCommand) {
        return {
          Items: [{
            user_id: "racing-player",
            rank: 4,
            updated_at: 100,
            stats: { elo_rating: 1200, wins: 1, losses: 1 }
          }]
        };
      }
      if (command instanceof UpdateCommand) {
        const error = new Error("profile changed") as Error & { name: string };
        error.name = "ConditionalCheckFailedException";
        throw error;
      }
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await rebuildLeaderboardRanks({});
    expect(result.playersSkipped).toBe(1);
    expect(result.playersUpdated).toBe(0);
    expect(result.rankChanges).toBe(0);
  });
});
