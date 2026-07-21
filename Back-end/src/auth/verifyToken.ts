import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env";

export interface CognitoPayload {
    sub: string;
    username?: string;
    email?: string;
    token_use: "access";
    client_id: string;
    exp?: number;
    iat?: number;
}

const JWKS = createRemoteJWKSet(
    new URL(
        `https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}/.well-known/jwks.json`
    )
);


export async function verifyToken(
    token: string
): Promise<CognitoPayload> {

    const { payload } = await jwtVerify(token, JWKS, {
        issuer:
            `https://cognito-idp.${env.region}.amazonaws.com/${env.userPoolId}`
    });


    if (payload.token_use !== "access") {
        throw new Error("Invalid token type.");
    }


    if (payload.client_id !== env.clientId) {
        throw new Error("Invalid client.");
    }


    if (!payload.sub) {
        throw new Error("Missing subject.");
    }


    return {
        sub: payload.sub,

        username:
            typeof payload.username === "string"
                ? payload.username
                : undefined,

        email:
            typeof payload.email === "string"
                ? payload.email
                : undefined,

        token_use: "access",

        client_id:
            payload.client_id as string,

        exp:
            payload.exp,

        iat:
            payload.iat
    };
}