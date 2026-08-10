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
} from "@aws-sdk/client-cognito-identity-provider";

import { cognito } from "./cognito";
import { env } from "../config/env";
import { secretHashAuthParameters, secretHashField } from "./utils";
import { validateRegister } from "./validators";
import { LoginRequest, RegisterRequest, VerifyRequest } from "./types";
import { normalizeConfirmationCode } from "./confirmationCode";
import { ensureUserProfile, findUserByUsername, isEmailInDeletionCooldown } from "../user/user.repository";
import { findCognitoUserByEmail, getCognitoUserByEmail } from "./cognito-user";

function getCognitoAttribute(
    attributes: Array<{ Name?: string; Value?: string }> | undefined,
    name: string,
): string | undefined {
    return attributes?.find((attribute) => attribute.Name === name)?.Value;
}

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

async function resendConfirmationForUser(email: string, username: string): Promise<void> {
    await cognito.send(new ResendConfirmationCodeCommand({
        ClientId: env.clientId,
        Username: username,
        ...secretHashField(username),
    }));
}

async function resendConfirmationForEmail(email: string): Promise<void> {
    try {
        // Email is the public sign-in identifier for the configured app client.
        // This path does not require cognito-idp:ListUsers or admin IAM access.
        await resendConfirmationForUser(email, email);
        return;
    } catch (error) {
        if (!(error instanceof UserNotFoundException)) throw error;
    }

    // Some pools use an internal username instead of email. Only those pools
    // need the admin ListUsers fallback to resolve the actual username.
    const user = await findCognitoUserByEmail(email);
    if (!user?.Username) {
        const error = new Error("Registration not found.");
        error.name = "UserNotFoundException";
        throw error;
    }
    await resendConfirmationForUser(email, user.Username);
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
                    throw new Error("This email is already registered. Please sign in instead.");
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

    let cognitoUsername = email;
    try {
        const existingUser = await findCognitoUserByEmail(email);
        if (existingUser?.Username) {
            cognitoUsername = existingUser.Username;
        }
    } catch {
        cognitoUsername = email;
    }

    try {
        const command = new ConfirmSignUpCommand({

            ClientId: env.clientId,

            Username: cognitoUsername,

            ConfirmationCode: code,

            ...secretHashField(cognitoUsername)

        });

        await cognito.send(command);

        try {
            const confirmedUser = await getCognitoUserByEmail(email);
            const username =
                getCognitoAttribute(confirmedUser?.Attributes, "preferred_username") ||
                email.split("@")[0];
            const userId =
                getCognitoAttribute(confirmedUser?.Attributes, "sub") ||
                confirmedUser?.Username;
            if (userId) {
                await ensureUserProfile({ id: userId, email, username });
            }
        } catch {
            // Admin API is restricted on this environment.
            // Profile will be created seamlessly during first login / token verification.
        }

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


