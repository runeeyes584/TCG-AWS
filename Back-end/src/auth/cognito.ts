import {
    CognitoIdentityProviderClient,
} from "@aws-sdk/client-cognito-identity-provider";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";

import { env } from "../config/env";

const adminRoleArn = env.cognitoAdminRoleArn;

if (adminRoleArn) {
    console.info(`[Cognito] Using cross-account admin role: ${adminRoleArn}`);
}

export const cognito = new CognitoIdentityProviderClient({
    region: env.region,
    ...(adminRoleArn
        ? {
            credentials: fromTemporaryCredentials({
                params: {
                    RoleArn: adminRoleArn,
                    RoleSessionName: "ChronoCognitoAdminSession",
                },
                clientConfig: { region: env.region },
            }),
        }
        : {}),
});

