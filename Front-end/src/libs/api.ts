const API_URL = "http://localhost:5000";

interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    user?: T;
}

async function request<T = any>(
    url: string,
    options: RequestInit = {}
): Promise<ApiResponse<T>> {

    const response = await fetch(`${API_URL}${url}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
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

            code

        })

    });

}

export async function login(
    email: string,
    password: string
) {

    return request("/auth/login", {

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

export async function refreshToken() {

    return request("/auth/refresh", {

        method: "POST"

    });

}

export async function me() {

    return request("/auth/me");

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
            code,
            password
        })
    });
}