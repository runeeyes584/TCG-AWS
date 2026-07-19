import {
  CreateTableCommand,
  CreateTableCommandInput,
} from "@aws-sdk/client-dynamodb";
import { dynamoDbClient } from "../config/dynamodb";

// ─── Table Definitions ────────────────────────────────────────────────────────

const tables: CreateTableCommandInput[] = [
  {
    TableName: "UserProfile",
    KeySchema: [{ AttributeName: "user_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "user_id", AttributeType: "S" },
    ],
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
];

// ─── Main: Create All Tables ──────────────────────────────────────────────────

const createTables = async (): Promise<void> => {
  console.log("Bắt đầu khởi tạo bảng DynamoDB...\n");

  for (const table of tables) {
    try {
      const command = new CreateTableCommand(table);
      await dynamoDbClient.send(command);
      console.log(`Đã tạo thành công bảng: ${table.TableName}`);
    } catch (error: any) {
      if (error.name === "ResourceInUseException") {
        console.log(`Bảng ${table.TableName} đã tồn tại — bỏ qua.`);
      } else {
        console.error(`Lỗi khi tạo bảng ${table.TableName}:`, error.message);
        process.exit(1);
      }
    }
  }

  console.log("\nHoàn tất khởi tạo tất cả các bảng!");
};

createTables();
