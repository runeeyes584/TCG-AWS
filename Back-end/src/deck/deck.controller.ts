import {
    Request,
    Response
} from "express";


import {
    createDeck
} from "./deck.service";


export async function createDeckController(
    req: Request,
    res: Response
) {
    try {

        const userId = req.user?.sub;

        if (!userId) {
            return res.status(401).json({
                success:false,
                message:"Unauthorized"
            });
        }

        const deck =
            await createDeck(
                userId,
                req.body
            );

        return res.status(201).json({
            success:true,
            data:deck
        });

    } catch(error) {

        return res.status(400).json({
            success:false,
            message:
                error instanceof Error
                ? error.message
                : "Create deck failed"
        });
    }
}