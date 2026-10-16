import {
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  UpdateTableCommand,
  type GlobalSecondaryIndex,
} from "@aws-sdk/client-dynamodb";
import { dynamoDbClient } from "../config/dynamodb";

// ─── Table Definitions ────────────────────────────────────────────────────────

// KEYS_ONLY lookup indexes that replace full-table Scans for username/email
// uniqueness checks (user.repository.ts falls back to Scan until they are ACTIVE).
const userProfileLookupIndexes: GlobalSecondaryIndex[] = [
  {
    IndexName: "UsernameIndex",
    KeySchema: [{ AttributeName: "username_lower", KeyType: "HASH" }],
    Projection: { ProjectionType: "KEYS_ONLY" },
  },
  {
    IndexName: "EmailIndex",
    KeySchema: [{ AttributeName: "email_lower", KeyType: "HASH" }],
    Projection: { ProjectionType: "KEYS_ONLY" },
  },
];

const tables: CreateTableCommandInput[] = [
  {
    TableName: "UserProfile",
    KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "leaderboard_scope", AttributeType: "S" },
      { AttributeName: "leaderboard_sort", AttributeType: "S" },
      { AttributeName: "username_lower", AttributeType: "S" },
      { AttributeName: "email_lower", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "LeaderboardIndex",
        KeySchema: [
          { AttributeName: "leaderboard_scope", KeyType: "HASH" },
          { AttributeName: "leaderboard_sort", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      ...userProfileLookupIndexes,
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "AccountDeletionCooldown",
    KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "email", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "GameState",
    KeySchema: [{ AttributeName: "match_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "match_id", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "GameLogs",
    KeySchema: [
      { AttributeName: "match_id", KeyType: "HASH" },
      { AttributeName: "action_sequence", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "match_id", AttributeType: "S" },
      { AttributeName: "action_sequence", AttributeType: "N" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "Connections",
    KeySchema: [{ AttributeName: "connection_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "connection_id", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
  {
    TableName: "MatchHistory",
    KeySchema: [
      { AttributeName: "user_id", KeyType: "HASH" },
      { AttributeName: "played_at", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "played_at", AttributeType: "N" },
    ],
    BillingMode: "PAY_PER_REQUEST",
  },
];

// ─── Helper: Check if a table already exists ──────────────────────────────────

const tableExists = async (tableName: string): Promise<boolean> => {
  try {
    await dynamoDbClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    return true;
  } catch (error: any) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
};

async function ensureUserProfileLeaderboardIndex(): Promise<void> {
  const description = await dynamoDbClient.send(
    new DescribeTableCommand({ TableName: "UserProfile" })
  );
  const indexes = description.Table?.GlobalSecondaryIndexes || [];
  if (indexes.some((index) => index.IndexName === "LeaderboardIndex")) {
    console.log("LeaderboardIndex already exists, skipping...");
    return;
  }
  if (description.Table?.TableStatus !== "ACTIVE") {
    throw new Error("UserProfile must be ACTIVE before LeaderboardIndex can be created.");
  }

  await dynamoDbClient.send(new UpdateTableCommand({
    TableName: "UserProfile",
    AttributeDefinitions: [
      { AttributeName: "leaderboard_scope", AttributeType: "S" },
      { AttributeName: "leaderboard_sort", AttributeType: "S" },
    ],
    GlobalSecondaryIndexUpdates: [{
      Create: {
        IndexName: "LeaderboardIndex",
        KeySchema: [
          { AttributeName: "leaderboard_scope", KeyType: "HASH" },
          { AttributeName: "leaderboard_sort", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    }],
  }));
  console.log("Started creating LeaderboardIndex on UserProfile.");
}

// DynamoDB allows only one GSI to be created at a time, so this creates the
// first missing lookup index and asks for a re-run once it is ACTIVE.
async function ensureUserProfileLookupIndexes(): Promise<void> {
  const description = await dynamoDbClient.send(
    new DescribeTableCommand({ TableName: "UserProfile" })
  );
  const existingIndexes = description.Table?.GlobalSecondaryIndexes || [];
  const missingIndex = userProfileLookupIndexes.find(
    (lookupIndex) => !existingIndexes.some((index) => index.IndexName === lookupIndex.IndexName)
  );
  const buildingIndex = existingIndexes.find((index) => index.IndexStatus && index.IndexStatus !== "ACTIVE");

  if (buildingIndex) {
    console.log(`Index ${buildingIndex.IndexName} is ${buildingIndex.IndexStatus}; re-run db:setup once it is ACTIVE.`);
    return;
  }
  if (!missingIndex) {
    console.log("UserProfile lookup indexes already exist, skipping...");
    return;
  }
  if (description.Table?.TableStatus !== "ACTIVE") {
    throw new Error("UserProfile must be ACTIVE before lookup indexes can be created.");
  }

  await dynamoDbClient.send(new UpdateTableCommand({
    TableName: "UserProfile",
    AttributeDefinitions: [
      { AttributeName: missingIndex.KeySchema![0].AttributeName, AttributeType: "S" },
    ],
    GlobalSecondaryIndexUpdates: [{ Create: missingIndex }],
  }));
  console.log(`Started creating ${missingIndex.IndexName} on UserProfile. Re-run db:setup after it is ACTIVE to create the next one.`);
}

// ─── Main: Create All Tables ──────────────────────────────────────────────────

const createTables = async (): Promise<void> => {
  let shouldMigrateUserProfileIndex = false;
  console.log("Bắt đầu khởi tạo bảng DynamoDB...\n");

  for (const table of tables) {
    const name = table.TableName!;
    try {
      const exists = await tableExists(name);

      if (exists) {
        if (name === "UserProfile") shouldMigrateUserProfileIndex = true;
        console.log(`Bảng ${name} đã tồn tại, bỏ qua...`);
      } else {
        await dynamoDbClient.send(new CreateTableCommand(table));
        console.log(`✓ Đã tạo thành công bảng: ${name}`);
      }
    } catch (error: any) {
      console.error(`Lỗi khi xử lý bảng ${name}:`, error.message);
      process.exit(1);
    }
  }

  // CreateTable definitions do not migrate an existing DynamoDB table.
  if (shouldMigrateUserProfileIndex) {
    await ensureUserProfileLeaderboardIndex();
    await ensureUserProfileLookupIndexes();
  }

  console.log("\nHoàn tất khởi tạo tất cả các bảng!");
};

createTables();
