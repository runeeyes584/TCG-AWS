/**
 * Writes `import-map.json`, the answer to "which existing resource is this?" for every resource of the adoption
 * template, so that `cdk import` runs without prompting:
 *
 *   npm run import:map && npm run import
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import { ChronoStack } from "../lib/chrono-stack";
import { ENVIRONMENT, STACK_NAME } from "../lib/config";

const cdkRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = new App({ context: { "aws:cdk:bundling-stacks": [] } });
const stack = new ChronoStack(app, STACK_NAME, { env: ENVIRONMENT, repoRoot: path.resolve(cdkRoot, ".."), adopt: true });
const resources: Record<string, { Type: string; Properties: Record<string, any> }> =
  app.synth().getStackByName(stack.stackName).template.Resources;

const identifierOf = (type: string, properties: Record<string, any>): Record<string, string> => {
  switch (type) {
    case "AWS::DynamoDB::Table":
      return { TableName: properties.TableName };
    case "AWS::Lambda::Function":
      return { FunctionName: properties.FunctionName };
    case "AWS::SQS::Queue":
      return { QueueUrl: `https://sqs.${ENVIRONMENT.region}.amazonaws.com/${ENVIRONMENT.account}/${properties.QueueName}` };
    default:
      throw new Error(`No import identifier for ${type}.`);
  }
};

const mapping = Object.fromEntries(
  Object.entries(resources).map(([logicalId, resource]) => [logicalId, identifierOf(resource.Type, resource.Properties)])
);
writeFileSync(path.join(cdkRoot, "import-map.json"), JSON.stringify(mapping, null, 2) + "\n");
console.log(`import-map.json: ${Object.keys(mapping).length} resources.`);
