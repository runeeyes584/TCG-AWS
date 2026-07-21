import jwt from "jsonwebtoken";

import { env } from "../config/env";

export function createToken(user:any){

    const jwtSecret = env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error("Missing required environment variable: JWT_SECRET");
    }

    return jwt.sign(

        {

            sub:user.sub,

            email:user.email,

            name:user.name

        },

        jwtSecret,

        {

            expiresIn:"7d"

        }

    );

}
