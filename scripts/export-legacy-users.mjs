/**
 * Writes the Cognito import CSV of the players who have not yet been moved to the new user pool (step 6 of
 * .agents/plan/docs/migration.md). Their password cannot be carried over: once imported they reset it, and the
 * backend then moves their profile through `custom:legacy_sub`.
 *
 *   node scripts/export-legacy-users.mjs <new user pool id> <output.csv>
 *
 * The old pool is read through the role of account 1650; the new pool with the credentials of the AWS CLI (9772).
 * The CSV holds emails: keep it out of the repository and delete it once imported.
 */
import { writeFile } from "node:fs/promises";
import {
  CognitoIdentityProviderClient,
  GetCSVHeaderCommand,
  ListUsersCommand
} from "@aws-sdk/client-cognito-identity-provider";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";

const LEGACY_POOL = {
  region: "ap-southeast-2",
  userPoolId: "ap-southeast-2_WM8KrQ2FM",
  roleArn: "arn:aws:iam::165030185238:role/Cognito-MigrationSource-Role"
};
const NEW_REGION = "ap-southeast-1";

const [newPoolId, outputPath] = process.argv.slice(2);
if (!newPoolId || !outputPath) {
  console.error("Usage: node scripts/export-legacy-users.mjs <new user pool id> <output.csv>");
  process.exit(1);
}

async function listAllUsers(client, userPoolId) {
  const users = [];
  let token;
  do {
    const page = await client.send(new ListUsersCommand({ UserPoolId: userPoolId, PaginationToken: token }));
    users.push(...(page.Users ?? []));
    token = page.PaginationToken;
  } while (token);
  return users;
}

const attributesOf = (user) =>
  Object.fromEntries((user.Attributes ?? []).map((attribute) => [attribute.Name, attribute.Value]));

/** CSV field, quoted when needed. */
const field = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

async function main() {
  const legacy = new CognitoIdentityProviderClient({
    region: LEGACY_POOL.region,
    credentials: fromTemporaryCredentials({ params: { RoleArn: LEGACY_POOL.roleArn, RoleSessionName: "chrono-user-export" } })
  });
  const current = new CognitoIdentityProviderClient({ region: NEW_REGION });

  const moved = await listAllUsers(current, newPoolId);
  const movedEmails = new Set(moved.map((user) => String(attributesOf(user).email ?? "").toLowerCase()));
  const movedLegacyIds = new Set(moved.map((user) => attributesOf(user)["custom:legacy_sub"]).filter(Boolean));

  const pending = (await listAllUsers(legacy, LEGACY_POOL.userPoolId))
    .filter((user) => user.UserStatus === "CONFIRMED" && user.Enabled !== false)
    .map(attributesOf)
    .filter((attributes) => attributes.email && !movedEmails.has(attributes.email.toLowerCase()) && !movedLegacyIds.has(attributes.sub));

  const { CSVHeader } = await current.send(new GetCSVHeaderCommand({ UserPoolId: newPoolId }));
  if (!CSVHeader.includes("custom:legacy_sub")) {
    throw new Error("The new user pool has no custom:legacy_sub attribute.");
  }
  const rows = pending.map((attributes) => {
    const values = {
      "cognito:username": attributes.email.toLowerCase(),
      email: attributes.email.toLowerCase(),
      email_verified: "true",
      preferred_username: attributes.preferred_username,
      "custom:legacy_sub": attributes.sub,
      "cognito:mfa_enabled": "false"
    };
    return CSVHeader.map((name) => field(values[name])).join(",");
  });

  await writeFile(outputPath, [CSVHeader.join(","), ...rows].join("\n") + "\n", "utf8");
  console.log(`Players not yet moved: ${pending.length}; already moved: ${moved.length}. CSV written to ${outputPath}.`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
