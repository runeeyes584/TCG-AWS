import { Request, Response } from "express";
import * as authService from "./auth.service";
import { LoginRequest, RegisterRequest, VerifyRequest } from "./types";

export async function register(
    req: Request<{}, {}, RegisterRequest>,
    res: Response
) {

    try {
console.log(req.headers);
console.log(req.body);
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
        console.log(result);
        console.log(req.body);
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
        console.log(req.cookies);

        res.cookie(
            "access_token",
            result.accessToken,
            {
                httpOnly: true,
                secure: false,      // localhost
                sameSite: "lax",
                maxAge: 60 * 60 * 1000
            }
        );

        res.cookie("email", req.body.email, {
            httpOnly: true,
            sameSite: "lax",
            secure: false
        });

        res.cookie(
            "refresh_token",
            result.refreshToken,
            {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 30 * 24 * 60 * 60 * 1000
            }
        );

        return res.json({
            success: true,
            message: "Login successful."
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

        const accessToken = req.cookies.access_token;

        if (accessToken) {

            await authService.logout(accessToken);

        }

    } catch {

        // Nếu token đã hết hạn thì vẫn tiếp tục xóa cookie
    }

    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.clearCookie("email");

    return res.json({

        success: true,

        message: "Logged out."

    });

}

export function me(
    req: Request,
    res: Response
) {

    return res.json({

        success: true,

        user: (req as any).user

    });

}

export async function refresh(
    req: Request,
    res: Response
) {

    const refreshToken = req.cookies.refresh_token;
    const email = req.cookies.email;

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

        res.cookie(
            "access_token",
            result.accessToken,
            {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 60 * 60 * 1000
            }
        );

        return res.json({

            success: true,

            message: "Token refreshed."

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