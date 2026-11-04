import serverlessExpress from "@codegenie/serverless-express";
import { app } from "../http/app";
import { preloadClientSecret } from "../auth/clientSecret";

preloadClientSecret();

export const handler = serverlessExpress({ app });
