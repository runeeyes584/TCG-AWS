import {
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  UpdateTableCommand,
} from "@aws-sdk/client-dynamodb";
import { dynamoDbClient } from "../config/dynamodb";

// ─── Table Definitions ────────────────────────────────────────────────────────

const tables: CreateTableCommandInput[] = [
  {
    TableName: "UserProfile",
    KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
      { AttributeName: "leaderboard_scope", AttributeType: "S" },
      { AttributeName: "leaderboard_sort", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [{
      IndexName: "LeaderboardIndex",
      KeySchema: [
        { AttributeName: "leaderboard_scope", KeyType: "HASH" },
        { AttributeName: "leaderboard_sort", KeyType: "RANGE" },
      ],
      Projection: { ProjectionType: "ALL" },
    }],
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
  }

  console.log("\nHoàn tất khởi tạo tất cả các bảng!");
};

createTables();
