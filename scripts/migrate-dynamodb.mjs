/**
 * Copies the game's DynamoDB tables from the partner account (6393, credentials in the Secrets Manager secret of
 * this account) to this account (9772, the credentials of the AWS CLI that runs the script).
 *
 *   node scripts/migrate-dynamodb.mjs plan     what would be copied; nothing is written
 *   node scripts/migrate-dynamodb.mjs create   creates the tables here (keys, indexes, TTL) and waits for them
 *   node scripts/migrate-dynamodb.mjs copy     copies the items; refuses while a match is in progress
 *   node scripts/migrate-dynamodb.mjs verify   compares both sides
 *
 * The source is only ever read. Profiles whose player no longer has an account in the old user pool are left out,
 * as decided for the migration (.agents/plan/docs/migration.md). Connections are never copied.
 */
import { CognitoIdentityProviderClient, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import {
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  DynamoDBClient,
  UpdateTimeToLiveCommand
} from "@aws-sdk/client-dynamodb";
import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { BatchWriteCommand, DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const REGION = "ap-southeast-1";
const SOURCE_SECRET = "ChronoGame/PartnerDB/Credentials";
const LEGACY_POOL = {
  region: "ap-southeast-2",
  userPoolId: "ap-southeast-2_WM8KrQ2FM",
  roleArn: "arn:aws:iam::165030185238:role/Cognito-MigrationSource-Role"
};

const string = (name) => ({ AttributeName: name, AttributeType: "S" });
const number = (name) => ({ AttributeName: name, AttributeType: "N" });
const hash = (name) => ({ AttributeName: name, KeyType: "HASH" });
const range = (name) => ({ AttributeName: name, KeyType: "RANGE" });
const index = (name, ...keys) => ({ IndexName: name, KeySchema: keys, Projection: { ProjectionType: "ALL" } });

/** The tables as they are in the source account, plus the two lookup indexes the code expects on UserProfile. */
const TABLES = [
  {
    TableName: "UserProfile",
    KeySchema: [hash("user_id")],
    AttributeDefinitions: [
      string("user_id"), string("leaderboard_scope"), string("leaderboard_sort"),
      string("email_lower"), string("username_lower")
    ],
    GlobalSecondaryIndexes: [
      index("LeaderboardIndex", hash("leaderboard_scope"), range("leaderboard_sort")),
      index("EmailIndex", hash("email_lower")),
      index("UsernameIndex", hash("username_lower"))
    ],
    copy: true
  },
  { TableName: "MatchHistory", KeySchema: [hash("user_id"), range("played_at")], AttributeDefinitions: [string("user_id"), number("played_at")], copy: true },
  { TableName: "GameLogs", KeySchema: [hash("match_id"), range("action_sequence")], AttributeDefinitions: [string("match_id"), number("action_sequence")], copy: true },
  { TableName: "GameState", KeySchema: [hash("match_id")], AttributeDefinitions: [string("match_id")], ttl: "expire_at", copy: true },
  { TableName: "AccountDeletionCooldown", KeySchema: [hash("email")], AttributeDefinitions: [string("email")], ttl: "available_at", copy: true },
  { TableName: "Connections", KeySchema: [hash("connection_id")], AttributeDefinitions: [string("connection_id")], copy: false }
];

const documentClient = (client) =>
  DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

async function sourceClients() {
  const secrets = new SecretsManagerClient({ region: REGION });
  const { SecretString } = await secrets.send(new GetSecretValueCommand({ SecretId: SOURCE_SECRET }));
  const secret = JSON.parse(SecretString);
  const raw = new DynamoDBClient({
    region: REGION,
    credentials: {
      accessKeyId: secret.accessKeyId || secret.AWS_ACCESS_KEY_ID,
      secretAccessKey: secret.secretAccessKey || secret.AWS_SECRET_ACCESS_KEY,
      ...(secret.sessionToken ? { sessionToken: secret.sessionToken } : {})
    }
  });
  return { raw, doc: documentClient(raw) };
}

function targetClients() {
  const raw = new DynamoDBClient({ region: REGION });
  return { raw, doc: documentClient(raw) };
}

async function scanAll(doc, tableName) {
  const items = [];
  let cursor;
  do {
    const page = await doc.send(new ScanCommand({ TableName: tableName, ExclusiveStartKey: cursor }));
    items.push(...(page.Items ?? []));
    cursor = page.LastEvaluatedKey;
  } while (cursor);
  return items;
}

async function tableStatus(raw, tableName) {
  try {
    const { Table } = await raw.send(new DescribeTableCommand({ TableName: tableName }));
    const indexes = (Table.GlobalSecondaryIndexes ?? []).map((gsi) => gsi.IndexStatus);
    return indexes.every((status) => status === "ACTIVE") ? Table.TableStatus : "INDEX_" + indexes.join(",");
  } catch (error) {
    if (error.name === "ResourceNotFoundException") return "MISSING";
    throw error;
  }
}

/** Every `sub` that still has an account in the old user pool, whatever its status. */
async function legacyAccountIds() {
  const cognito = new CognitoIdentityProviderClient({
    region: LEGACY_POOL.region,
    credentials: fromTemporaryCredentials({ params: { RoleArn: LEGACY_POOL.roleArn, RoleSessionName: "chrono-dynamodb-migration" } })
  });
  const ids = new Set();
  let token;
  do {
    const page = await cognito.send(new ListUsersCommand({ UserPoolId: LEGACY_POOL.userPoolId, PaginationToken: token }));
    for (const user of page.Users ?? []) {
      const sub = user.Attributes?.find((attribute) => attribute.Name === "sub")?.Value;
      if (sub) ids.add(sub);
    }
    token = page.PaginationToken;
  } while (token);
  return ids;
}

const normalize = (value) => String(value ?? "").trim().toLowerCase();

/** The profile as it is written here: with the lookup keys the indexes need (left out when blank). */
function withLookupKeys(profile) {
  const emailLower = normalize(profile.email);
  const usernameLower = normalize(profile.username);
  return {
    ...profile,
    ...(emailLower ? { email_lower: emailLower } : {}),
    ...(usernameLower ? { username_lower: usernameLower } : {})
  };
}

/** The items to write for one table, after the decisions of the migration. */
async function itemsToCopy(source, table, accountIds) {
  const items = await scanAll(source.doc, table.TableName);
  if (table.TableName !== "UserProfile") return { items, skipped: [] };
  const kept = items.filter((profile) => accountIds.has(profile.user_id));
  const skipped = items.filter((profile) => !accountIds.has(profile.user_id)).map((profile) => profile.user_id);
  return { items: kept.map(withLookupKeys), skipped };
}

async function writeAll(doc, tableName, items) {
  for (let start = 0; start < items.length; start += 25) {
    let requests = items.slice(start, start + 25).map((Item) => ({ PutRequest: { Item } }));
    for (let attempt = 0; requests.length > 0; attempt += 1) {
      if (attempt > 8) throw new Error(`${tableName}: items still unprocessed after retries.`);
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 100 * 2 ** attempt));
      const result = await doc.send(new BatchWriteCommand({ RequestItems: { [tableName]: requests } }));
      requests = result.UnprocessedItems?.[tableName] ?? [];
    }
  }
}

/** A turn lasts 30 s at most, so a match whose turn started longer ago than this was abandoned, not running. */
const ABANDONED_AFTER_MS = 10 * 60_000;

async function activeMatches(source) {
  const states = await scanAll(source.doc, "GameState");
  return states.filter((state) =>
    state.status === "IN_PROGRESS" &&
    !state.engine_state?.winnerId &&
    Date.now() - Number(state.engine_state?.turnStartTime ?? 0) < ABANDONED_AFTER_MS
  ).length;
}

async function plan() {
  const source = await sourceClients();
  const target = targetClients();
  const accountIds = await legacyAccountIds();
  console.log(`Old user pool accounts: ${accountIds.size}`);
  console.log(`Matches in progress at the source: ${await activeMatches(source)}`);
  for (const table of TABLES) {
    const { items, skipped } = await itemsToCopy(source, table, accountIds);
    const what = table.copy ? `copy ${items.length}` : "not copied";
    const left = skipped.length ? `, leave out ${skipped.length} profile(s) without an account` : "";
    console.log(`${table.TableName.padEnd(24)} ${what}${left}; here: ${await tableStatus(target.raw, table.TableName)}`);
  }
}

async function create() {
  const target = targetClients();
  for (const { copy: _copy, ttl, ...definition } of TABLES) {
    if (await tableStatus(target.raw, definition.TableName) === "MISSING") {
      await target.raw.send(new CreateTableCommand({ ...definition, BillingMode: "PAY_PER_REQUEST" }));
      console.log(`${definition.TableName}: created`);
    } else {
      console.log(`${definition.TableName}: already exists`);
    }
  }
  for (const table of TABLES) {
    let status;
    while ((status = await tableStatus(target.raw, table.TableName)) !== "ACTIVE") {
      console.log(`${table.TableName}: ${status}, waiting`);
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    if (table.ttl) {
      const { TimeToLiveDescription } = await target.raw.send(new DescribeTimeToLiveCommand({ TableName: table.TableName }));
      if (TimeToLiveDescription?.TimeToLiveStatus !== "ENABLED") {
        await target.raw.send(new UpdateTimeToLiveCommand({
          TableName: table.TableName,
          TimeToLiveSpecification: { AttributeName: table.ttl, Enabled: true }
        }));
      }
      console.log(`${table.TableName}: TTL on ${table.ttl}`);
    }
  }
  console.log("All tables are ACTIVE.");
}

async function copy() {
  const source = await sourceClients();
  const target = targetClients();
  const running = await activeMatches(source);
  if (running > 0 && !process.argv.includes("--allow-active")) {
    throw new Error(`${running} match(es) still in progress at the source. Wait for them to end (or pass --allow-active).`);
  }
  const accountIds = await legacyAccountIds();
  for (const table of TABLES.filter((candidate) => candidate.copy)) {
    if (await tableStatus(target.raw, table.TableName) !== "ACTIVE") {
      throw new Error(`${table.TableName} is not ACTIVE here; run "create" first.`);
    }
    const { items, skipped } = await itemsToCopy(source, table, accountIds);
    await writeAll(target.doc, table.TableName, items);
    console.log(`${table.TableName}: copied ${items.length}${skipped.length ? `, left out ${skipped.length}` : ""}`);
  }
}

const stable = (value) =>
  JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([left], [right]) => left.localeCompare(right)))
      : inner);

async function verify() {
  const source = await sourceClients();
  const target = targetClients();
  const accountIds = await legacyAccountIds();
  let failures = 0;
  for (const table of TABLES.filter((candidate) => candidate.copy)) {
    const { items: expected } = await itemsToCopy(source, table, accountIds);
    const actual = await scanAll(target.doc, table.TableName);
    const keyOf = (item) => table.KeySchema.map((key) => String(item[key.AttributeName])).join("#");
    const actualByKey = new Map(actual.map((item) => [keyOf(item), item]));
    const missing = expected.filter((item) => !actualByKey.has(keyOf(item))).length;
    const different = expected.filter((item) => actualByKey.has(keyOf(item)) && stable(actualByKey.get(keyOf(item))) !== stable(item)).length;
    const ok = missing === 0 && different === 0;
    if (!ok) failures += 1;
    console.log(`${table.TableName.padEnd(24)} source ${expected.length}, here ${actual.length}, missing ${missing}, different ${different} ${ok ? "OK" : "FAIL"}`);
  }
  // Items written here after the copy (new players, new matches) are expected and are not a failure.
  if (failures > 0) {
    process.exitCode = 1;
    console.log("Verification FAILED.");
  } else {
    console.log("Verification passed.");
  }
}

const commands = { plan, create, copy, verify };
const command = commands[process.argv[2]];
if (!command) {
  console.error("Usage: node scripts/migrate-dynamodb.mjs <plan|create|copy|verify> [--allow-active]");
  process.exit(1);
}
command().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
