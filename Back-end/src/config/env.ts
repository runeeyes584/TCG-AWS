import dotenv from "dotenv";
import path from "path";

if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    dotenv.config({
        path: path.resolve(process.cwd(), "Back-end/.env")
    });
}

function required(name: string, value: string | undefined): string {
    if (!value) throw new Error(`Missing required environment variable: ${name}`);
    return value;
}

export const env = {
    region: required(
        "COGNITO_REGION",
        process.env.COGNITO_REGION || process.env.AWS_REGION
    ),
    userPoolId: required("COGNITO_USER_POOL_ID", process.env.COGNITO_USER_POOL_ID),
    clientId: required("COGNITO_CLIENT_ID", process.env.COGNITO_CLIENT_ID),
    // Required only when the selected Cognito app client was created with a secret.
    clientSecret: process.env.COGNITO_CLIENT_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
};
