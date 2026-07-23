import serverlessExpress from "@codegenie/serverless-express";
import { app } from "../http/app";

export const handler = serverlessExpress({ app });
