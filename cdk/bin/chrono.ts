import path from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import { ChronoStack } from "../lib/chrono-stack";
import { ENVIRONMENT, STACK_NAME } from "../lib/config";

const app = new App();
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

new ChronoStack(app, STACK_NAME, {
  env: ENVIRONMENT,
  repoRoot,
  // `-c adopt=true` only for `cdk import` (see .agents/plan/docs/cdk.md).
  adopt: app.node.tryGetContext("adopt") === "true" || app.node.tryGetContext("adopt") === true,
  description: "Chrono Genesis game backend: DynamoDB tables, match-result queue and Lambda functions."
});
