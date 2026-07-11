import {
    CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";

import { env } from "../config/env";

export const cognito = new CognitoIdentityProviderClient({
    region: env.region,
});

