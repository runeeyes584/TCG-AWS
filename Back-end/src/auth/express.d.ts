import type { CognitoPayload } from "./auth.types";

declare global {
    namespace Express {
        interface Request {
            user?: CognitoPayload;
        }
    }
}

export {};