import jwt from "jsonwebtoken";

import { env } from "../config/env";

export function createToken(user:any){

    return jwt.sign(

        {

            sub:user.sub,

            email:user.email,

            name:user.name

        },

        env.JWT_SECRET,

        {

            expiresIn:"7d"

        }

    );

}