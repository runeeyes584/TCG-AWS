import { RegisterRequest } from "./types";

export function validateRegister(data: RegisterRequest) {
    const { email, username, password } = data;

    if (!email || !username || !password) {
        throw new Error("Missing required fields.");
    }

    const trimmedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        throw new Error("Invalid email address format.");
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 3 || trimmedUsername.length > 20) {
        throw new Error("Username must be between 3 and 20 characters.");
    }

    if (!/^[A-Za-z0-9_]+$/.test(trimmedUsername)) {
        throw new Error(
            "Username can only contain letters, numbers and underscores."
        );
    }

    if (password.length < 8) {
        throw new Error("Password must be at least 8 characters long.");
    }

    if (!/[A-Z]/.test(password)) {
        throw new Error("Password must contain at least one uppercase letter (A-Z).");
    }

    if (!/[a-z]/.test(password)) {
        throw new Error("Password must contain at least one lowercase letter (a-z).");
    }

    if (!/[0-9]/.test(password)) {
        throw new Error("Password must contain at least one number (0-9).");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        throw new Error("Password must contain at least one special character (e.g. !@#$%^&*).");
    }
}