import crypto from "crypto";
import { env } from "../config/env";

export function secretHash(username: string) {
    return crypto
        .createHmac("sha256", env.clientSecret)
        .update(username + env.clientId)
        .digest("base64");
}