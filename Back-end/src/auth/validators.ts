import { RegisterRequest } from "./types";

export function validateRegister(data: RegisterRequest) {

    const { email, username, password } = data;

    if (!email || !username || !password) {
        throw new Error("Missing required fields.");
    }

    if (username.length < 3 || username.length > 20) {
        throw new Error("Username must be between 3 and 20 characters.");
    }

    if (!/^[A-Za-z0-9_]+$/.test(username)) {
        throw new Error(
            "Username can only contain letters, numbers and underscores."
        );
    }

    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters.");
    }
}