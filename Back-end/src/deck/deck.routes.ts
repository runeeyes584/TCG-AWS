import {
    Router
} from "express";


import {
    createDeckController
} from "./deck.controller";


import {
    authenticate
} from "../auth/auth.middleware";


const router =
    Router();



router.post(
    "/create",
    authenticate,
    createDeckController
);



export default router;