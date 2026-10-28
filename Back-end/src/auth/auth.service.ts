import {
    SignUpCommand,
    UsernameExistsException,
    ConfirmSignUpCommand,
    CodeMismatchException,
    ExpiredCodeException,
    InitiateAuthCommand,
    NotAuthorizedException,
    UserNotConfirmedException,
    GlobalSignOutCommand,
    ForgotPasswordCommand,
    ConfirmForgotPasswordCommand,
    ResendConfirmationCodeCommand,
    InvalidParameterException,
    UserNotFoundException,
    AliasExistsException,
    UserLambdaValidationException,
} from "@aws-sdk/client-cognito-identity-provider";

import { cognito } from "./cognito";
import { env } from "../config/env";
import { secretHashAuthParameters, secretHashField } from "./utils";
import { validateRegister } from "./validators";
import { LoginRequest, RegisterRequest, VerifyRequest } from "./types";
import { normalizeConfirmationCode } from "./confirmationCode";
import { ensureUserProfile, findUserByUsername, getUserByEmail, isEmailInDeletionCooldown } from "../user/user.repository";
import { getCognitoIdentityByAccessToken, type CognitoIdentity } from "./cognito-user";
import { verifyIdToken, verifyToken } from "./verifyToken";
import { activateSession, assertActiveSession, endSession, sessionIdOf } from "../session/activeSession";
import { evictConnections, findPlayerConnections } from "../session/connectionEviction";

async function signUpNewUser(email: string, username: string, password: string) {
    return cognito.send(
        new SignUpCommand({
            ClientId: env.clientId,
            Username: email,
            Password: password,
            ...(await secretHashField(email)),
            UserAttributes: [
                { Name: "email", Value: email },
                { Name: "preferred_username", Value: username },
            ],
        }),
    );
}

async function resendConfirmationForEmail(email: string): Promise<void> {
    await cognito.send(new ResendConfirmationCodeCommand({
        ClientId: env.clientId,
        Username: email,
        ...(await secretHashField(email)),
    }));
}

function emailAlreadyRegisteredError(): Error {
    const error = new Error("This email is already registered. Please sign in instead.");
    error.name = "EmailAlreadyRegisteredError";
    return error;
}

function emailDeletionCooldownError(remainingHours: number): Error {
    const error = new Error(`This email belongs to an account deleted recently. You cannot register with this email for 24 hours (please wait ${remainingHours} more hour(s)).`);
    error.name = "EmailDeletionCooldownError";
    return error;
}

export async function register(data: RegisterRequest) {

    const normalizedData = {
        ...data,
        email: data.email.trim().toLowerCase(),
        username: data.username.trim(),
    };
    validateRegister(normalizedData);

    const { email, username, password } = normalizedData;

    const cooldown = await isEmailInDeletionCooldown(email);
    if (cooldown.inCooldown) {
        const remainingHours = cooldown.availableAt
            ? Math.max(1, Math.ceil((cooldown.availableAt - Date.now()) / (60 * 60 * 1000)))
            : 24;
        throw emailDeletionCooldownError(remainingHours);
    }

    // DynamoDB is the authoritative application-level check. This also
    // catches profiles created by an earlier auth flow before Cognito is
    // contacted, so a different callsign cannot reuse the same email.
    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
        throw emailAlreadyRegisteredError();
    }

    const existingUsername = await findUserByUsername(username);
    if (existingUsername) {
        throw new Error(`Operative callsign '${username}' is already taken by another player.`);
    }

    try {

        await signUpNewUser(email, username, password);

        return {
            success: true,
            message: "Verification code has been sent to your email.",
            requiresVerification: true,
        };

    } catch (error) {
        if (error instanceof AliasExistsException) {
            throw emailAlreadyRegisteredError();
        }

        if (error instanceof UsernameExistsException) {
            try {
                await resendConfirmationForEmail(email);
                return {
                    success: true,
                    message: "A verification code has been resent to your email. Please complete verification to continue.",
                    requiresVerification: true,
                    resumedUnconfirmed: true,
                };
            } catch (resumeError) {
                if (resumeError instanceof InvalidParameterException || resumeError instanceof NotAuthorizedException) {
                    // Resend is accepted only for an UNCONFIRMED Cognito
                    // registration. A confirmed user must sign in and must
                    // never be routed to the OTP page from Register.
                    throw emailAlreadyRegisteredError();
                }
                throw resumeError;
            }
        }
        throw error;
    }
}

export async function verify(data: VerifyRequest) {

    const email = data.email.trim().toLowerCase();
    const code = normalizeConfirmationCode(data.code);

    try {
        const command = new ConfirmSignUpCommand({

            ClientId: env.clientId,

            // The app client is configured with email as the sign-in alias.
            // Keep confirmation on the public client path; never resolve or
            // persist Cognito's generated internal Username here.
            Username: email,

            ConfirmationCode: code,

            ...(await secretHashField(email))

        });

        await cognito.send(command);

        return {

            success: true,

            message: "Account verified successfully."

        };

    } catch (error) {

        if (error instanceof CodeMismatchException) {
            throw new Error("Invalid verification code.");
        }

        if (error instanceof ExpiredCodeException) {
            throw new Error("Verification code has expired.");
        }

        throw error;
    }
}

/**
 * Makes this sign-in the player's only active one (the latest sign-in wins), then pushes the WebSocket connections of
 * earlier sign-ins out. Pushing out is best effort: the earlier session is refused anyway on its next request.
 */
async function startSession(userId: string, accessToken: string): Promise<void> {
    const sessionId = sessionIdOf(await verifyToken(accessToken));
    if (!sessionId) {
        console.warn("The access token has no origin_jti; single-session sign-in is not enforced for it.");
        return;
    }
    await activateSession(userId, sessionId);

    const endpoint = process.env.WS_MANAGEMENT_ENDPOINT;
    if (!endpoint) return;
    try {
        await evictConnections(endpoint, await findPlayerConnections(userId), () => "device");
    } catch (error) {
        console.warn("Could not push out the connections of the replaced session:", error);
    }
}

export async function login(data: LoginRequest) {

    const email = data.email.trim().toLowerCase();
    const { password } = data;

    try {

        const command = new InitiateAuthCommand({

            ClientId: env.clientId,

            AuthFlow: "USER_PASSWORD_AUTH",

            AuthParameters: {

                USERNAME: email,

                PASSWORD: password,

                ...(await secretHashAuthParameters(email))

            }

        });

        const response = await cognito.send(command);

        const accessToken = response.AuthenticationResult?.AccessToken;
        const idToken = response.AuthenticationResult?.IdToken;
        if (!accessToken) {
            throw new Error("Cognito did not return an access token.");
        }

        // ID-token claims are verified locally and contain the attributes that
        // were submitted during registration. GetUser is the public Cognito
        // fallback when an app client does not expose all claims in the ID token.
        let identity: CognitoIdentity | undefined;
        if (idToken) {
            try {
                const claims = await verifyIdToken(idToken);
                const claimId = typeof claims.sub === "string" ? claims.sub : undefined;
                const claimEmail = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : undefined;
                const claimUsername = typeof claims.preferred_username === "string" ? claims.preferred_username.trim() : undefined;
                const claimLegacyId = typeof claims["custom:legacy_sub"] === "string" ? claims["custom:legacy_sub"].trim() : "";
                if (claimId && claimEmail && claimUsername) {
                    identity = {
                        id: claimId,
                        email: claimEmail,
                        username: claimUsername,
                        ...(claimLegacyId ? { legacyId: claimLegacyId } : {})
                    };
                }
            } catch {
                // GetUser below remains the public fallback for this case.
            }
        }
        if (!identity) {
            const publicUser = await getCognitoIdentityByAccessToken(accessToken);
            identity = publicUser;
        }
        await ensureUserProfile(identity);
        await startSession(identity.id, accessToken);

        return {

            success: true,

            accessToken: response.AuthenticationResult?.AccessToken,

            idToken: response.AuthenticationResult?.IdToken,

            refreshToken: response.AuthenticationResult?.RefreshToken,

            expiresIn: response.AuthenticationResult?.ExpiresIn

        };

    }
    catch (error) {

        if (error instanceof UserNotConfirmedException) {
            throw new Error("Account is not verified. Please complete registration or sign up again.");
        }

        // The user-migration trigger refuses an unknown account or a wrong password of the old user pool; to the
        // player that is the same as a wrong password.
        if (
            error instanceof NotAuthorizedException ||
            error instanceof UserNotFoundException ||
            error instanceof UserLambdaValidationException
        ) {

            throw new Error("Invalid email or password.");

        }

        throw error;

    }

}

export async function refresh(
    refreshToken: string,
    email: string
) {

    const command = new InitiateAuthCommand({

        ClientId: env.clientId,

        AuthFlow: "REFRESH_TOKEN_AUTH",

        AuthParameters: {

            REFRESH_TOKEN: refreshToken,

            ...(await secretHashAuthParameters(email))

        }

    });

    const response = await cognito.send(command);
    const accessToken = response.AuthenticationResult?.AccessToken;
    // A refresh keeps the session of the sign-in it came from: a session that a later sign-in replaced gets nothing.
    if (accessToken) await assertActiveSession(await verifyToken(accessToken));
    return {
        accessToken,
        idToken: response.AuthenticationResult?.IdToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn
    };
}

export async function logout(
    accessToken: string
) {

    const claims = await verifyToken(accessToken).catch(() => undefined);
    const sessionId = claims ? sessionIdOf(claims) : undefined;
    if (typeof claims?.sub === "string" && sessionId) {
        await endSession(claims.sub, sessionId).catch((error) => console.warn("Could not end the session:", error));
    }

    const command = new GlobalSignOutCommand({

        AccessToken: accessToken

    });

    await cognito.send(command);

}

export async function forgotPassword(email: string) {
    const command = new ForgotPasswordCommand({
        ClientId: env.clientId,
        Username: email,
        ...(await secretHashField(email))
    });

    await cognito.send(command);

    return {
        success: true,
        message: "Verification code has been sent."
    };
}

export async function resetPassword(
    email: string,
    code: string,
    password: string
) {
    const normalizedCode = normalizeConfirmationCode(code);

    const command = new ConfirmForgotPasswordCommand({
        ClientId: env.clientId,
        Username: email,
        ConfirmationCode: normalizedCode,
        Password: password,
        ...(await secretHashField(email))
    });

    await cognito.send(command);

    return {
        success: true,
        message: "Password changed successfully."
    };
}

export async function resendConfirmationCode(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    try {
        await resendConfirmationForEmail(normalizedEmail);

        return {
            success: true,
            message: "A verification code has been resent to your email.",
        };
    } catch (error) {
        if (
            error instanceof InvalidParameterException ||
            error instanceof NotAuthorizedException
        ) {
            throw new Error("This account is already verified or invalid.");
        }

        if (error instanceof UserNotFoundException || (error instanceof Error && error.name === "UserNotFoundException")) {
            throw new Error("This registration could not be found or has expired.");
        }

        throw error;
    }
}


