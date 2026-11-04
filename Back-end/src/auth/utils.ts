import crypto from "crypto";
import { env } from "../config/env";
import { getClientSecret } from "./clientSecret";

export async function secretHash(username: string): Promise<string | undefined> {
    const clientSecret = await getClientSecret();
    if (!clientSecret) return undefined;

    return crypto
        .createHmac("sha256", clientSecret)
        .update(username + env.clientId)
        .digest("base64");
}

export async function secretHashField(username: string): Promise<{ SecretHash?: string }> {
    const hash = await secretHash(username);
    return hash ? { SecretHash: hash } : {};
}

export async function secretHashAuthParameters(username: string): Promise<Record<string, string>> {
    const hash = await secretHash(username);
    return hash ? { SECRET_HASH: hash } : {};
}
