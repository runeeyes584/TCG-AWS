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
    AdminGetUserCommand,
    InvalidParameterException,
} from "@aws-sdk/client-cognito-identity-provider";

import { cognito } from "./cognito";
import { env } from "../config/env";
import { secretHash } from "./utils";
import { validateRegister } from "./validators";
import { LoginRequest, RegisterRequest, VerifyRequest } from "./types";

export async function register(data: RegisterRequest) {

    validateRegister(data);

    const { email, username, password } = data;

    try {

        await cognito.send(
            new SignUpCommand({
                ClientId: env.clientId,
                Username: email,
                Password: password,
                SecretHash: secretHash(email),
                UserAttributes: [
                    {
                        Name: "email",
                        Value: email,
                    },
                    {
                        Name: "preferred_username",
                        Value: username,
                    },
                ],
            })
        );


        return {
            success: true,
            message: "Verification code has been sent to your email.",
        };

    } catch (error) {

        if (error instanceof UsernameExistsException) {

            try {

                await cognito.send(
                    new ResendConfirmationCodeCommand({
                        ClientId: env.clientId,
                        Username: email,
                        SecretHash: secretHash(email),
                    })
                );

                return {
                    success: true,
                    message: "Your account is not verified. A new verification code has been sent.",
                };

            } catch (resendError) {

                if (
                    resendError instanceof InvalidParameterException ||
                    resendError instanceof NotAuthorizedException
                ) {
                    throw new Error("Email already exists.");
                }

                throw resendError;
            }
        }

        throw error;
    }
}

export async function verify(data: VerifyRequest) {

    const { email, code } = data;

    try {

        const command = new ConfirmSignUpCommand({

            ClientId: env.clientId,

            Username: email,

            ConfirmationCode: code,

            SecretHash: secretHash(email)

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

    const { email, password } = data;

    try {

        const command = new InitiateAuthCommand({

            ClientId: env.clientId,

            AuthFlow: "USER_PASSWORD_AUTH",

            AuthParameters: {

                USERNAME: email,

                PASSWORD: password,

                SECRET_HASH: secretHash(email)

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

            throw new Error("Account is not verified.");

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

            SECRET_HASH: secretHash(email)

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
        SecretHash: secretHash(email)
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
    const command = new ConfirmForgotPasswordCommand({
        ClientId: env.clientId,
        Username: email,
        ConfirmationCode: code,
        Password: password,
        SecretHash: secretHash(email)
    });

    await cognito.send(command);

    return {
        success: true,
        message: "Password changed successfully."
    };
}

