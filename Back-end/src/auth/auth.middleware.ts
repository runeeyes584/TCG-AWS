import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./verifyToken";
import { error } from "console";

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
) {

    try {

        const token = req.cookies.access_token;

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
    catch {

        return res.status(401).json({

            success: false,

            message: error instanceof Error ? error.message : "Invalid token."

        });

    }

}