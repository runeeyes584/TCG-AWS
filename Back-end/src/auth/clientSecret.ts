import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { env } from "../config/env";

/**
 * The client secret of the Cognito app client. In AWS it lives in SSM Parameter Store (a SecureString named by
 * `COGNITO_CLIENT_SECRET_PARAM`) and is read once per Lambda instance; locally `COGNITO_CLIENT_SECRET` is used as is.
 */
let pending: Promise<string | undefined> | undefined;

function loadFromParameterStore(name: string): Promise<string | undefined> {
    const ssm = new SSMClient({ region: process.env.AWS_REGION || env.region });
    return ssm.send(new GetParameterCommand({ Name: name, WithDecryption: true }))
        .then((result) => {
            const value = result.Parameter?.Value?.trim();
            if (!value) throw new Error(`SSM parameter ${name} is empty.`);
            return value;
        });
}

export function getClientSecret(): Promise<string | undefined> {
    if (!env.clientSecretParameter) return Promise.resolve(env.clientSecret);
    pending ??= loadFromParameterStore(env.clientSecretParameter).catch((error) => {
        // A failed read is retried by the next request instead of being cached.
        pending = undefined;
        throw error;
    });
    return pending;
}

/** Starts the read while the Lambda instance initialises, outside the time of the first request. */
export function preloadClientSecret(): void {
    getClientSecret().catch((error) => console.error("Could not read the Cognito client secret:", error));
}
