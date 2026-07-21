import crypto from "crypto";
import { env } from "../config/env";

export function secretHash(username: string) {
    if (!env.clientSecret) return undefined;

    return crypto
        .createHmac("sha256", env.clientSecret)
        .update(username + env.clientId)
        .digest("base64");
}
