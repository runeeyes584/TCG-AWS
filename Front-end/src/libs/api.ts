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
    const response = await fetch(requestUrl, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        },
        ...options
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || "Request failed.");
    }

    return data;
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
