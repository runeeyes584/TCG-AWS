import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./verifyToken";

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
        const token = req.cookies.access_token || bearerToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized."
            });
        }

        const payload = await verifyToken(token);
        (req as any).user = payload;

        next();

    }
    catch (error) {
        return res.status(401).json({
            success: false,
            message: error instanceof Error ? error.message : "Invalid token."
        });
    }
}
