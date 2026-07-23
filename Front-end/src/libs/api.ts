import type { SaveDeckPayload, SavedDeck } from "@backend/decks/deck.types";

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const API_URL = (
    configuredApiUrl || (process.env.NODE_ENV === "development" ? "http://localhost:5000" : "")
).replace(/\/$/, "");

export interface LoginResponse {
    success: boolean;
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface RefreshTokenResponse {
    success: boolean;
    accessToken: string;
    expiresIn?: number;
}

interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    user?: T;
}

export interface PlayerProfile {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    elo: number;
    wins: number;
    losses: number;
}

export interface PendingMatch {
    roomCode: string;
    status: "WAITING" | "IN_PROGRESS";
    playerId?: "P1" | "P2";
    opponentConnected?: boolean;
}

export interface LeaderboardPlayer {
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
    isCurrentPlayer: boolean;
    rankPending: boolean;
}

export interface LeaderboardResponse {
    success: boolean;
    scope: "GLOBAL";
    entries: LeaderboardPlayer[];
    currentPlayer: LeaderboardPlayer | null;
    nextCursor: string | null;
}

function parseLeaderboardPlayer(value: unknown): LeaderboardPlayer | null {
    if (!value || typeof value !== "object") return null;
    const player = value as Record<string, unknown>;
    if (typeof player.userId !== "string" || typeof player.username !== "string") return null;

    const number = (field: string) => {
        const parsed = Number(player[field]);
        return Number.isFinite(parsed) ? parsed : 0;
    };
    const rank = Number(player.rank);
    const rankUpdatedAt = Number(player.rankUpdatedAt);
    const projectedAt = Number(player.projectedAt);

    return {
        userId: player.userId,
        username: player.username || `Player_${player.userId.slice(0, 5)}`,
        ...(typeof player.avatar === "string" && player.avatar ? { avatar: player.avatar } : {}),
        elo: Math.max(0, number("elo")),
        wins: Math.max(0, Math.trunc(number("wins"))),
        losses: Math.max(0, Math.trunc(number("losses"))),
        winRate: Math.min(1, Math.max(0, number("winRate"))),
        ...(Number.isInteger(rank) && rank > 0 ? { rank } : {}),
        ...(Number.isFinite(rankUpdatedAt) && rankUpdatedAt > 0 ? { rankUpdatedAt } : {}),
        ...(Number.isFinite(projectedAt) && projectedAt > 0 ? { projectedAt } : {}),
        isCurrentPlayer: player.isCurrentPlayer === true,
        rankPending: player.rankPending === true
    };
}

export async function saveDeck(payload: SaveDeckPayload): Promise<{
    success: boolean;
    message: string;
    deck: SavedDeck;
}> {
    await ensureFreshAccessToken();
    return request(process.env.NEXT_PUBLIC_SAVE_DECK_API_URL || "/decks", {
        method: "POST",
        body: JSON.stringify(payload)
    });
}

export async function listDecks(): Promise<{
    success: boolean;
    decks: SavedDeck[];
}> {
    await ensureFreshAccessToken();
    return request("/decks");
}

export async function getLeaderboard(
    limit = 50,
    cursor?: string
): Promise<LeaderboardResponse> {
    await ensureFreshAccessToken();
    const query = new URLSearchParams({ limit: String(limit) });
    if (cursor) query.set("cursor", cursor);
    const data = await request<unknown>(`/leaderboard?${query.toString()}`);
    if (!data || typeof data !== "object") throw new Error("Leaderboard returned an invalid response.");

    const response = data as Record<string, unknown>;
    if (
        response.success !== true ||
        response.scope !== "GLOBAL" ||
        !Array.isArray(response.entries) ||
        !(response.nextCursor === null || typeof response.nextCursor === "string")
    ) {
        throw new Error("Leaderboard returned an invalid response.");
    }

    const parsedEntries = response.entries.map(parseLeaderboardPlayer);
    if (parsedEntries.some((player) => !player)) {
        throw new Error("Leaderboard returned invalid player data.");
    }
    const entries = parsedEntries as LeaderboardPlayer[];
    if (response.currentPlayer !== null && response.currentPlayer === undefined) {
        throw new Error("Leaderboard returned an invalid current player.");
    }
    const currentPlayer = response.currentPlayer === null
        ? null
        : parseLeaderboardPlayer(response.currentPlayer);
    if (response.currentPlayer !== null && !currentPlayer) {
        throw new Error("Leaderboard returned an invalid current player.");
    }

    return {
        success: true,
        scope: "GLOBAL",
        entries,
        currentPlayer,
        nextCursor: typeof response.nextCursor === "string" ? response.nextCursor : null
    };
}

export async function getMyRank(): Promise<{
    success: boolean;
    player: LeaderboardPlayer | null;
}> {
    await ensureFreshAccessToken();
    const data = await request<unknown>("/leaderboard/me");
    if (!data || typeof data !== "object") throw new Error("Rank service returned an invalid response.");
    const response = data as Record<string, unknown>;
    if (response.success !== true) throw new Error("Rank service returned an invalid response.");
    if (response.player !== null && response.player === undefined) {
        throw new Error("Rank service returned an invalid player.");
    }
    const player = response.player === null ? null : parseLeaderboardPlayer(response.player);
    if (response.player !== null && !player) {
        throw new Error("Rank service returned invalid player data.");
    }
    return {
        success: true,
        player
    };
}

async function request<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const token = typeof window === "undefined"
        ? undefined
        : window.localStorage.getItem("accessToken");

    const requestUrl = /^https?:\/\//.test(url) ? url : `${API_URL}${url}`;
    if (!/^https?:\/\//.test(requestUrl)) {
        throw new Error("NEXT_PUBLIC_API_URL is required outside local development.");
    }
    const { headers: optionHeaders, ...requestOptions } = options;
    const response = await fetch(requestUrl, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(optionHeaders || {})
        },
        ...requestOptions
    });

    const rawBody = await response.text();
    let data: any;
    if (rawBody) {
        try {
            data = JSON.parse(rawBody);
        } catch {
            const isHtml = /^\s*(?:<!doctype|<html)/i.test(rawBody);
            throw new Error(
                isHtml
                    ? "The API returned an HTML page instead of JSON. Check that NEXT_PUBLIC_API_URL points to the HTTP API Gateway invoke URL and includes the correct stage."
                    : `The API returned invalid JSON (HTTP ${response.status}).`
            );
        }
    }

    if (!response.ok) {
        throw new Error(
            data && typeof data.message === "string"
                ? data.message
                : `Request failed (HTTP ${response.status}).`
        );
    }

    return data as T;
}

export async function register(
    username: string,
    email: string,
    password: string
) {

    return request("/auth/register", {

        method: "POST",

        body: JSON.stringify({

            username,

            email,

            password

        })

    });

}

export async function verify(
    email: string,
    code: string
) {

    return request("/auth/verify", {

        method: "POST",

        body: JSON.stringify({

            email,

            code: code.trim()

        })

    });

}

export async function login(
    email: string,
    password: string
): Promise<LoginResponse> {

    return request<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email,
            password
        })
    });
}

export async function logout() {

    return request("/auth/logout", {

        method: "POST"

    });

}

export async function refreshToken(): Promise<RefreshTokenResponse> {

    const storedRefreshToken = typeof window === "undefined"
        ? undefined
        : window.localStorage.getItem("refreshToken");
    const email = typeof window === "undefined"
        ? undefined
        : window.localStorage.getItem("email");

    return request<RefreshTokenResponse>("/auth/refresh", {

        method: "POST",
        body: JSON.stringify({ refreshToken: storedRefreshToken, email })

    });

}

export function accessTokenNeedsRefresh(token: string, minimumValidityMs = 60_000): boolean {
    try {
        const payloadSegment = token.split(".")[1];
        if (!payloadSegment) {
            return true;
        }

        const normalizedPayload = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
        const paddedPayload = normalizedPayload.padEnd(
            normalizedPayload.length + ((4 - (normalizedPayload.length % 4)) % 4),
            "="
        );
        const payload = JSON.parse(window.atob(paddedPayload)) as { exp?: unknown };
        const expiresAt = typeof payload.exp === "number" ? payload.exp * 1_000 : 0;

        return expiresAt <= Date.now() + minimumValidityMs;
    } catch {
        return true;
    }
}

export async function me(): Promise<ApiResponse<PlayerProfile>> {

    return request("/auth/me");

}

export async function getPendingMatch(): Promise<{ success: boolean; match: PendingMatch | null }> {
    await ensureFreshAccessToken();
    return request("/matches/pending");
}

export async function forfeitPendingMatch(): Promise<{ success: boolean }> {
    await ensureFreshAccessToken();
    return request("/matches/pending/forfeit", { method: "POST" });
}

/** Cancels a pre-game room/queue entry and never surrenders an active match. */
export async function cancelPendingMatchmaking(): Promise<{ success: boolean }> {
    await ensureFreshAccessToken();
    return request("/matches/pending/cancel", { method: "POST" });
}

export async function ensureFreshAccessToken(): Promise<string> {
    const token = typeof window === "undefined"
        ? undefined
        : window.localStorage.getItem("accessToken");
    if (!token) throw new Error("Please sign in again to check your active match.");
    if (!accessTokenNeedsRefresh(token)) return token;

    const refreshed = await refreshToken();
    if (!refreshed.accessToken || refreshed.accessToken.split(".").length !== 3) {
        throw new Error("Your session expired. Please sign in again.");
    }
    window.localStorage.setItem("accessToken", refreshed.accessToken);
    return refreshed.accessToken;
}

export async function forgotPassword(email: string) {
    return request("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email })
    });
}

export async function resetPassword(
    email: string,
    code: string,
    password: string
) {
    return request("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
            email,
            code: code.trim(),
            password
        })
    });
}
