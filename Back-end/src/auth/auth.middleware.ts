import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./verifyToken";
import { assertActiveSession } from "../session/activeSession";
import { sendApiError } from "../http/error-response";

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {

    try {
        const authorization = req.header("authorization");
        const bearerToken = authorization?.startsWith("Bearer ")
            ? authorization.slice("Bearer ".length).trim()
            : undefined;
        const token = bearerToken || req.cookies?.access_token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        let payload: Awaited<ReturnType<typeof verifyToken>>;
        try {
            payload = await verifyToken(token);
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: error instanceof Error ? error.message : "Invalid token."
            });
        }

        // A valid token from a session that a later sign-in replaced is refused (401 SESSION_REPLACED).
        await assertActiveSession(payload);

        (req as any).user = payload;
        (req as any).accessToken = token;

        next();

    }
    catch (error) {
        return sendApiError(res, error, "Unable to verify the session.");
    }
}
