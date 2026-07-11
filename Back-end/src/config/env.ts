import dotenv from "dotenv";

dotenv.config();

export const env = {
    region: process.env.COGNITO_REGION!,
    userPoolId: process.env.COGNITO_USER_POOL_ID!,
    clientId: process.env.COGNITO_CLIENT_ID!,
    clientSecret: process.env.COGNITO_CLIENT_SECRET!,
};