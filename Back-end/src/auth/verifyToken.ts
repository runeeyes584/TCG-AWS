import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

const JWKS = createRemoteJWKSet(
    new URL(
        `https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}/.well-known/jwks.json`
    )
);

export async function verifyToken(token: string) {

    const { payload } = await jwtVerify(token, JWKS, {
        issuer: `https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}`
    });

    if (payload.token_use !== "access") {
        throw new Error("Invalid token type.");
    }

    if (payload.client_id !== env.clientId) {
        throw new Error("Invalid client.");
    }

    return payload;
}