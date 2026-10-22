/**
 * Points the game's Lambda functions at the resources of this account (step 5.5 of .agents/plan/docs/migration.md):
 * DynamoDB through each function's execution role instead of the partner credentials, and the Cognito functions at
 * the new user pool.
 *
 *   node scripts/switch-lambda-config.mjs plan                  what would change; nothing is written
 *   node scripts/switch-lambda-config.mjs backup  <file.json>   saves the current environment of every function
 *   node scripts/switch-lambda-config.mjs apply   <file.json>   switches them; the backup file must exist
 *   node scripts/switch-lambda-config.mjs rollback <file.json>  puts the saved environment back
 *
 * Only environment variables change; the code of the functions is not touched. The backup holds secrets: keep it
 * out of the repository. The new client secret is read from Cognito, never typed.
 */
import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { CognitoIdentityProviderClient, DescribeUserPoolClientCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
  GetFunctionConfigurationCommand,
  LambdaClient,
  UpdateFunctionConfigurationCommand,
  waitUntilFunctionUpdatedV2
} from "@aws-sdk/client-lambda";

const REGION = "ap-southeast-1";
const NEW_POOL = {
  region: "ap-southeast-1",
  userPoolId: "ap-southeast-1_nwGt4qcaV",
  clientId: "48rjrvog21he1937bnosvvk353"
};

/** Every function that reaches DynamoDB with the partner credentials today. */
export const FUNCTIONS = [
  "chrono-http-backend",
  "StartMatch-function",
  "ConnectHandler-function",
  "Rebuild_Leader_Board-function",
  "HandleTimeout-function",
  "ProcessGameEngine-function",
  "PostMatchWorker-function",
  "CancelMatch-function",
  "DisconnectHandler-function",
  "EndMatch-function"
];

/** The functions that verify Cognito tokens or call Cognito. */
const COGNITO_FUNCTIONS = new Set(["chrono-http-backend", "ConnectHandler-function"]);

const PARTNER_SETTINGS = ["DYNAMODB_CREDENTIAL_MODE", "DB_SECRET_NAME"];

/**
 * The environment a function has once switched: the partner DynamoDB settings are dropped (the SDK then uses the
 * execution role), the Cognito functions point at the new pool, and every other variable is kept as it is.
 */
export function switchedEnvironment(functionName, environment, newClientSecret) {
  const next = Object.fromEntries(
    Object.entries(environment ?? {}).filter(([name]) => !PARTNER_SETTINGS.includes(name))
  );
  if (COGNITO_FUNCTIONS.has(functionName)) {
    Object.assign(next, {
      COGNITO_REGION: NEW_POOL.region,
      COGNITO_USER_POOL_ID: NEW_POOL.userPoolId,
      COGNITO_CLIENT_ID: NEW_POOL.clientId,
      COGNITO_CLIENT_SECRET: newClientSecret
    });
  }
  return next;
}

const isSecret = (name) => /SECRET|KEY|PASSWORD|TOKEN/i.test(name);
const shown = (name, value) => (value === undefined ? "(none)" : isSecret(name) ? "***" : value);

function describeChanges(before, after) {
  const names = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  return names
    .filter((name) => before[name] !== after[name])
    .map((name) => `    ${name}: ${shown(name, before[name])} -> ${shown(name, after[name])}`);
}

const lambda = new LambdaClient({ region: REGION });

async function currentEnvironments() {
  const environments = {};
  for (const name of FUNCTIONS) {
    const configuration = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: name }));
    environments[name] = configuration.Environment?.Variables ?? {};
  }
  return environments;
}

async function newClientSecret() {
  const cognito = new CognitoIdentityProviderClient({ region: NEW_POOL.region });
  const { UserPoolClient } = await cognito.send(new DescribeUserPoolClientCommand({
    UserPoolId: NEW_POOL.userPoolId,
    ClientId: NEW_POOL.clientId
  }));
  if (!UserPoolClient?.ClientSecret) throw new Error("The new app client has no client secret.");
  return UserPoolClient.ClientSecret;
}

async function setEnvironment(name, variables) {
  await lambda.send(new UpdateFunctionConfigurationCommand({ FunctionName: name, Environment: { Variables: variables } }));
  await waitUntilFunctionUpdatedV2({ client: lambda, maxWaitTime: 120 }, { FunctionName: name });
}

async function readBackup(file) {
  if (!file) throw new Error("Give the backup file.");
  const backup = JSON.parse(await readFile(file, "utf8"));
  const missing = FUNCTIONS.filter((name) => !(name in backup));
  if (missing.length > 0) throw new Error(`The backup has no environment for: ${missing.join(", ")}`);
  return backup;
}

async function plan() {
  const secret = await newClientSecret();
  for (const [name, environment] of Object.entries(await currentEnvironments())) {
    const changes = describeChanges(environment, switchedEnvironment(name, environment, secret));
    console.log(`${name}: ${changes.length ? "" : "nothing to change"}`);
    changes.forEach((line) => console.log(line));
  }
}

async function backup(file) {
  if (!file) throw new Error("Give the backup file.");
  await writeFile(file, JSON.stringify(await currentEnvironments(), null, 2), { encoding: "utf8", flag: "wx" });
  console.log(`Saved the environment of ${FUNCTIONS.length} functions to ${file}.`);
}

async function apply(file) {
  await readBackup(file);
  const secret = await newClientSecret();
  for (const [name, environment] of Object.entries(await currentEnvironments())) {
    const next = switchedEnvironment(name, environment, secret);
    if (describeChanges(environment, next).length === 0) {
      console.log(`${name}: already switched`);
      continue;
    }
    await setEnvironment(name, next);
    console.log(`${name}: switched`);
  }
}

async function rollback(file) {
  const saved = await readBackup(file);
  for (const name of FUNCTIONS) {
    await setEnvironment(name, saved[name]);
    console.log(`${name}: restored`);
  }
}

const commands = { plan, backup, apply, rollback };

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const command = commands[process.argv[2]];
  if (!command) {
    console.error("Usage: node scripts/switch-lambda-config.mjs <plan|backup|apply|rollback> [file.json]");
    process.exit(1);
  }
  command(process.argv[3]).catch((error) => {
    console.error(error.message ?? error);
    process.exit(1);
  });
}
