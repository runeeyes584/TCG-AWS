import crypto from "crypto";
import { env } from "../config/env";

export function secretHash(username: string) {
    if (!env.clientSecret) return undefined;

    return crypto
        .createHmac("sha256", env.clientSecret)
        .update(username + env.clientId)
        .digest("base64");
}

export function secretHashField(username: string): { SecretHash?: string } {
    const hash = secretHash(username);
    return hash ? { SecretHash: hash } : {};
}

export function secretHashAuthParameters(username: string): Record<string, string> {
    const hash = secretHash(username);
    return hash ? { SECRET_HASH: hash } : {};
}
