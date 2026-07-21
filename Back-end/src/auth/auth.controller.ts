import { Request, Response } from "express";
import * as authService from "./auth.service";
import { LoginRequest, RegisterRequest, VerifyRequest, ResetPasswordRequest, ForgotPasswordRequest } from "./types";
import { ensureUserProfile, getUserById } from "../user/user.repository";

const productionCookies = process.env.NODE_ENV === "production";
const authCookieOptions = {
    httpOnly: true,
    secure: productionCookies,
    sameSite: productionCookies ? "none" as const : "lax" as const
};

export async function register(
    req: Request<{}, {}, RegisterRequest>,
    res: Response
) {

    try {
        const result = await authService.register(req.body);
        return res.status(201).json(result);
    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error"
        });
    }
}

export async function verify(
    req: Request<{}, {}, VerifyRequest>,
    res: Response
) {

    try {

        const result = await authService.verify(req.body);
        return res.json(result);

    } catch (error) {

        return res.status(400).json({

            success: false,

            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error"

        });

    }

}

export async function login(
    req: Request<{}, {}, LoginRequest>,
    res: Response
) {

    try {

        const result = await authService.login(req.body);

        // return res.json(result);
        // console.log(req.cookies);

        res.cookie(
            "access_token",
            result.accessToken,
            {
                ...authCookieOptions,
                maxAge: 60 * 60 * 1000
            }
        );

        res.cookie("email", req.body.email, {
            ...authCookieOptions
        });

        res.cookie(
            "refresh_token",
            result.refreshToken,
            {
                ...authCookieOptions,
                maxAge: 30 * 24 * 60 * 60 * 1000
            }
        );

        return res.json({
            success: true,
            message: "Login successful.",
            accessToken: result.accessToken,
            idToken: result.idToken,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn
        });

    }
    catch (error) {
        return res.status(400).json({
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown error"

        });
    }
}

export async function logout(
    req: Request,
    res: Response
) {

    try {

        const authorization = req.header("authorization");
        const accessToken = req.cookies.access_token || (
            authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : undefined
        );

        if (accessToken) {

            await authService.logout(accessToken);

        }

    } catch {

        // Nếu token đã hết hạn thì vẫn tiếp tục xóa cookie
    }

    res.clearCookie("access_token", authCookieOptions);
    res.clearCookie("refresh_token", authCookieOptions);
    res.clearCookie("email", authCookieOptions);

    return res.json({

        success: true,

        message: "Logged out."

    });

}

export async function me(
    req: Request,
    res: Response
) {

    const payload = (req as any).user || {};
    const userId = typeof payload.sub === "string" ? payload.sub : undefined;
    const email = req.cookies.email ?? (typeof payload.username === "string" ? payload.username : "");
    let user = userId ? await getUserById(userId) : undefined;
    if (!user && userId) {
        user = await ensureUserProfile({
            id: userId,
            email,
            username: typeof payload.preferred_username === "string"
                ? payload.preferred_username
                : `User_${userId.slice(0, 5)}`
        });
    }

    return res.json({

        success: true,

        user: user ?? (req as any).user

    });

}

export async function refresh(
    req: Request,
    res: Response
) {

    const refreshToken = req.cookies.refresh_token || req.body?.refreshToken;
    const email = req.cookies.email || req.body?.email;

    if (!refreshToken || !email) {

        return res.status(401).json({

            success: false,

            message: "Unauthorized."

        });

    }

    try {

        const result = await authService.refresh(
            refreshToken,
            email
        );

        if (!result.accessToken) {
            throw new Error("Refresh did not return an access token.");
        }

        res.cookie(
            "access_token",
            result.accessToken,
            {
                ...authCookieOptions,
                maxAge: 60 * 60 * 1000
            }
        );

        return res.json({

            success: true,

            message: "Token refreshed.",

            accessToken: result.accessToken,

            expiresIn: result.expiresIn

        });

    } catch (error) {

        return res.status(401).json({

            success: false,

            message: error instanceof Error
                ? error.message
                : "Refresh failed."

        });

    }

}

export async function forgotPassword(
    req: Request<{}, {}, ForgotPasswordRequest>,
    res: Response
) {
    try {
        const result = await authService.forgotPassword(req.body.email);

        return res.json(result);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unknown error"
        });
    }
}

export async function resetPassword(
    req: Request<{}, {}, ResetPasswordRequest>,
    res: Response
) {
    try {
        const result = await authService.resetPassword(
            req.body.email,
            req.body.code,
            req.body.password
        );

        return res.json(result);
    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error instanceof Error
                ? error.message
                : "Unknown error"
        });
    }
}
