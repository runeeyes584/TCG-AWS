const API_URL = "http://localhost:5000";

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
}

export interface CreateDeckPayload {
    deckName: string;
    cardIds: string[];
}


export interface CreateDeckResponse {
    success: boolean;
    data: {
        deckId: string;
        deckName: string;
        cardIds: string[];
        updatedAt: number;
    };
}

async function request<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const token = typeof window === "undefined"
        ? undefined
        : window.localStorage.getItem("accessToken");

    const response = await fetch(`${API_URL}${url}`, {
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

    return request<RefreshTokenResponse>("/auth/refresh", {

        method: "POST"

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
    return request("/matches/pending");
}

export async function forfeitPendingMatch(): Promise<{ success: boolean }> {
    return request("/matches/pending/forfeit", { method: "POST" });
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

export async function createDeck(
    payload: CreateDeckPayload
): Promise<CreateDeckResponse> {

    return request<CreateDeckResponse>(
        "/decks/create",
        {
            method: "POST",
            body: JSON.stringify(payload)
        }
    );

}