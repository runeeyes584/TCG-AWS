import { describe, expect, it } from "vitest";
import {
  buildLeaderboardProjection,
  compareProfiles,
  profileMetrics,
  toRankedProfile
} from "./leaderboard";

function profile(
  userId: string,
  elo: number,
  wins: number,
  losses: number
): Record<string, any> {
  return {
    user_id: userId,
    username: userId,
    stats: { elo_rating: elo, rank_points: elo, wins, losses }
  };
}

describe("leaderboard projection", () => {
  it("orders by ELO, win rate, wins, then a deterministic user id", () => {
    const users = [
      profile("lower-elo", 1200, 100, 0),
      profile("lower-rate", 1300, 5, 5),
      profile("more-wins", 1300, 20, 20),
      profile("best-rate", 1300, 8, 2)
    ];

    expect(users.sort(compareProfiles).map((user) => user.user_id)).toEqual([
      "best-rate",
      "more-wins",
      "lower-rate",
      "lower-elo"
    ]);
  });

  it("builds a sparse-GSI projection from legacy stats", () => {
    const projected = buildLeaderboardProjection(profile("player-1", 1016, 3, 1), 1234);
    expect(projected).toMatchObject({
      leaderboard_scope: "GLOBAL",
      leaderboard_elo: 1016,
      leaderboard_win_rate: 0.75,
      leaderboard_wins: 3,
      leaderboard_losses: 1,
      leaderboard_projected_at: 1234
    });
    expect(projected.leaderboard_sort).toContain("player-1");
  });

  it("handles profiles with no games without NaN", () => {
    expect(profileMetrics({ user_id: "new-user", stats: {} })).toEqual({
      elo: 1000,
      wins: 0,
      losses: 0,
      winRate: 0
    });
    expect(toRankedProfile({ user_id: "new-user", username: "New" }).winRate).toBe(0);
  });
});
