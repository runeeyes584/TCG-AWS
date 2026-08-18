import { me, getPendingMatch, listDecks, getMyRank, type PlayerProfile } from "./api";

export interface CachedPlayerProfile {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  elo: number;
  wins: number;
  losses: number;
  rank?: number;
  updatedAt: number;
}

const PROFILE_CACHE_KEY = "user_profile";

export function getCachedProfile(): CachedPlayerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(PROFILE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPlayerProfile;
    if (parsed && typeof parsed === "object" && typeof parsed.email === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCachedProfile(profile: Partial<CachedPlayerProfile>): void {
  if (typeof window === "undefined") return;
  try {
    const current = getCachedProfile() || {
      id: "",
      username: "",
      email: "",
      elo: 1200,
      wins: 0,
      losses: 0,
      updatedAt: 0,
    };
    const updated: CachedPlayerProfile = {
      ...current,
      ...profile,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(updated));
    if (updated.email) {
      window.localStorage.setItem("email", updated.email);
    }
  } catch (error) {
    console.warn("[ProfileCache] Failed to write cache:", error);
  }
}

export function clearCachedProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_CACHE_KEY);
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("email");
  } catch (error) {
    console.warn("[ProfileCache] Failed to clear cache:", error);
  }
}

export async function warmupUserSession(): Promise<CachedPlayerProfile | null> {
  const timeoutMs = 2000;

  const warmupTask = Promise.allSettled([
    me(),
    getPendingMatch(),
    listDecks(),
    getMyRank(),
  ]);

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  );

  const results = await Promise.race([warmupTask, timeoutPromise]);

  if (!results) {
    // Timed out, return whatever is already in cache
    return getCachedProfile();
  }

  const meResult = results[0];
  if (meResult.status === "fulfilled" && meResult.value?.user) {
    const user = meResult.value.user as PlayerProfile;
    setCachedProfile({
      id: user.id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      elo: user.elo,
      wins: user.wins,
      losses: user.losses,
    });
    return getCachedProfile();
  }

  return getCachedProfile();
}
