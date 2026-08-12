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
} from "@aws-sdk/client-cognito-identity-provider";

import { cognito } from "./cognito";
import { env } from "../config/env";
import { secretHashAuthParameters, secretHashField } from "./utils";
import { validateRegister } from "./validators";
import { LoginRequest, RegisterRequest, VerifyRequest } from "./types";
import { normalizeConfirmationCode } from "./confirmationCode";
import { ensureUserProfile, findUserByUsername, getUserByEmail, isEmailInDeletionCooldown } from "../user/user.repository";
import { getCognitoIdentityByAccessToken } from "./cognito-user";
import { verifyIdToken } from "./verifyToken";

async function signUpNewUser(email: string, username: string, password: string) {
    return cognito.send(
        new SignUpCommand({
            ClientId: env.clientId,
            Username: email,
            Password: password,
            ...secretHashField(email),
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
        ...secretHashField(email),
    }));
}

function emailAlreadyRegisteredError(): Error {
    const error = new Error("This email is already registered. Please sign in instead.");
    error.name = "EmailAlreadyRegisteredError";
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
        throw new Error("This email was recently deleted. You must wait 24 hours before registering again with this email.");
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

            ...secretHashField(email)

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

                ...secretHashAuthParameters(email)

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
        let identity: { id: string; email: string; username: string } | undefined;
        if (idToken) {
            try {
                const claims = await verifyIdToken(idToken);
                const claimId = typeof claims.sub === "string" ? claims.sub : undefined;
                const claimEmail = typeof claims.email === "string" ? claims.email.trim().toLowerCase() : undefined;
                const claimUsername = typeof claims.preferred_username === "string" ? claims.preferred_username.trim() : undefined;
                if (claimId && claimEmail && claimUsername) {
                    identity = { id: claimId, email: claimEmail, username: claimUsername };
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

        if (error instanceof NotAuthorizedException) {

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

            ...secretHashAuthParameters(email)

        }

    });

    const response = await cognito.send(command);
    return {
        accessToken: response.AuthenticationResult?.AccessToken,
        idToken: response.AuthenticationResult?.IdToken,
        expiresIn: response.AuthenticationResult?.ExpiresIn
    };
}

export async function logout(
    accessToken: string
) {

    const command = new GlobalSignOutCommand({

        AccessToken: accessToken

    });

    await cognito.send(command);

}

export async function forgotPassword(email: string) {
    const command = new ForgotPasswordCommand({
        ClientId: env.clientId,
        Username: email,
        ...secretHashField(email)
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
        ...secretHashField(email)
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


