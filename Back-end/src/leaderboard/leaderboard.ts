export const GLOBAL_LEADERBOARD_SCOPE = "GLOBAL";
export const DEFAULT_LEADERBOARD_INDEX = "LeaderboardIndex";

const SORT_NUMBER_WIDTH = 12;
const WIN_RATE_SCALE = 1_000_000_000;

export interface LeaderboardProjection {
  leaderboard_scope: typeof GLOBAL_LEADERBOARD_SCOPE;
  leaderboard_sort: string;
  leaderboard_elo: number;
  leaderboard_win_rate: number;
  leaderboard_wins: number;
  leaderboard_losses: number;
  leaderboard_projected_at: number;
}

export interface RankedProfile {
  userId: string;
  username: string;
  avatar?: string;
  elo: number;
  wins: number;
  losses: number;
  winRate: number;
  rank?: number;
  rankUpdatedAt?: number;
  projectedAt?: number;
}

function finiteNonNegative(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

function paddedInteger(value: number): string {
  return Math.round(Math.max(0, value)).toString().padStart(SORT_NUMBER_WIDTH, "0");
}

export function profileMetrics(profile: Record<string, any>) {
  const elo = finiteNonNegative(
    profile.stats?.elo_rating ?? profile.stats?.rank_points ?? profile.elo,
    1000
  );
  const wins = finiteNonNegative(profile.stats?.wins ?? profile.wins);
  const losses = finiteNonNegative(profile.stats?.losses ?? profile.losses);
  const games = wins + losses;
  const winRate = games > 0 ? wins / games : 0;
  return { elo, wins, losses, winRate };
}

/**
 * DynamoDB sorts strings byte-by-byte. Fixed-width numeric segments therefore
 * preserve the desired order when LeaderboardIndex is queried descending:
 * ELO, then win-rate, then wins. user_id is a deterministic final tie-breaker.
 */
export function leaderboardSortKey(
  profile: Record<string, any>,
  metrics = profileMetrics(profile)
): string {
  return [
    paddedInteger(metrics.elo * 100),
    paddedInteger(metrics.winRate * WIN_RATE_SCALE),
    paddedInteger(metrics.wins),
    String(profile.user_id || "")
  ].join("#");
}

export function buildLeaderboardProjection(
  profile: Record<string, any>,
  projectedAt: number
): LeaderboardProjection {
  const metrics = profileMetrics(profile);
  return {
    leaderboard_scope: GLOBAL_LEADERBOARD_SCOPE,
    leaderboard_sort: leaderboardSortKey(profile, metrics),
    leaderboard_elo: metrics.elo,
    leaderboard_win_rate: metrics.winRate,
    leaderboard_wins: metrics.wins,
    leaderboard_losses: metrics.losses,
    leaderboard_projected_at: projectedAt
  };
}

export function compareProfiles(left: Record<string, any>, right: Record<string, any>): number {
  const leftKey = leaderboardSortKey(left);
  const rightKey = leaderboardSortKey(right);
  if (leftKey === rightKey) return 0;
  return leftKey > rightKey ? -1 : 1;
}

export function toRankedProfile(profile: Record<string, any>): RankedProfile {
  const metrics = profileMetrics(profile);
  const rank = Number(profile.rank);
  const rankUpdatedAt = Number(profile.rank_updated_at);
  const projectedAt = Number(profile.leaderboard_projected_at);
  return {
    userId: String(profile.user_id),
    username: String(profile.username || `User_${String(profile.user_id).slice(0, 5)}`),
    ...(profile.avatar_url || profile.avatar
      ? { avatar: String(profile.avatar_url || profile.avatar) }
      : {}),
    elo: metrics.elo,
    wins: metrics.wins,
    losses: metrics.losses,
    winRate: metrics.winRate,
    ...(Number.isInteger(rank) && rank > 0 ? { rank } : {}),
    ...(Number.isFinite(rankUpdatedAt) ? { rankUpdatedAt } : {}),
    ...(Number.isFinite(projectedAt) ? { projectedAt } : {})
  };
}
