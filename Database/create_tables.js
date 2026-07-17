/**
 * create_tables.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Script tạo 4 bảng DynamoDB cho dự án TCG-AWS lên tài khoản AWS Cloud.
 *
 * Bảng được tạo:
 *  1. UserProfile   – Hồ sơ người dùng, deck bài, lịch sử trận
 *  2. GameState     – Trạng thái bàn cờ thời gian thực (có TTL 2h)
 *  3. GameLogs      – Log từng nước cờ để Replay / chống gian lận
 *  4. Connections   – Ánh xạ WebSocket connection_id → user_id + match_id
 *
 * Cài đặt trước khi chạy:
 *  npm install @aws-sdk/client-dynamodb dotenv
 *
 * Cấu hình AWS credentials trong file .env ở thư mục gốc dự án:
 *  AWS_ACCESS_KEY_ID=your_access_key
 *  AWS_SECRET_ACCESS_KEY=your_secret_key
 *  AWS_REGION=ap-southeast-1
 *
 * Chạy script:
 *  node Database/create_tables.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
    DynamoDBClient,
    CreateTableCommand,
    DescribeTableCommand,
    UpdateTimeToLiveCommand,
    waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// ── Load environment variables từ .env ở thư mục gốc ──────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, "../Back-end/.env") });

// ── Khởi tạo DynamoDB Client ────────────────────────────────────────────────
const client = new DynamoDBClient({
    region: process.env.AWS_REGION || "ap-southeast-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(process.env.AWS_SESSION_TOKEN && {
            sessionToken: process.env.AWS_SESSION_TOKEN,
        }),
    },
});

// ── Định nghĩa cấu hình các bảng ────────────────────────────────────────────

/**
 * 1. Bảng UserProfile
 *    PK: user_id (String)
 *    Không có TTL — dữ liệu tồn tại vĩnh viễn
 */
const userProfileTableDef = {
    TableName: "UserProfile",
    BillingMode: "PAY_PER_REQUEST", // On-demand — không cần đặt capacity trước
    KeySchema: [
        { AttributeName: "user_id", KeyType: "HASH" }, // Partition Key
    ],
    AttributeDefinitions: [
        { AttributeName: "user_id", AttributeType: "S" },
    ],
    Tags: [
        { Key: "Project", Value: "TCG-AWS" },
        { Key: "Table", Value: "UserProfile" },
    ],
};

/**
 * 2. Bảng GameState
 *    PK: match_id (String)
 *    TTL: expire_at (Number) — tự động xóa trận đấu rác sau 2 tiếng
 *
 *    Thiết kế players: { [user_id]: { ... } }  →  Map động, dễ truy cập từ Frontend
 */
const gameStateTableDef = {
    TableName: "GameState",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
        { AttributeName: "match_id", KeyType: "HASH" }, // Partition Key
    ],
    AttributeDefinitions: [
        { AttributeName: "match_id", AttributeType: "S" },
    ],
    Tags: [
        { Key: "Project", Value: "TCG-AWS" },
        { Key: "Table", Value: "GameState" },
    ],
};

/**
 * 3. Bảng GameLogs
 *    PK: match_id (String)
 *    SK: action_sequence (Number) — đảm bảo thứ tự không bị đảo lộn
 *    Không có TTL — giữ lại vĩnh viễn cho Replay / phân tích
 */
const gameLogsTableDef = {
    TableName: "GameLogs",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
        { AttributeName: "match_id", KeyType: "HASH" },        // Partition Key
        { AttributeName: "action_sequence", KeyType: "RANGE" }, // Sort Key
    ],
    AttributeDefinitions: [
        { AttributeName: "match_id", AttributeType: "S" },
        { AttributeName: "action_sequence", AttributeType: "N" },
    ],
    Tags: [
        { Key: "Project", Value: "TCG-AWS" },
        { Key: "Table", Value: "GameLogs" },
    ],
};

/**
 * 4. Bảng Connections
 *    PK: connection_id (String) — từ API Gateway WebSocket
 *    TTL: expire_at (Number) — tự động xóa kết nối rác sau 24h
 *
 *    GSI: match_id-index
 *      PK: match_id → cho phép query "tất cả connection đang trong trận X"
 *      Phục vụ broadcast tới cả 2 player mà không cần scan toàn bảng
 */
const connectionsTableDef = {
    TableName: "Connections",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
        { AttributeName: "connection_id", KeyType: "HASH" }, // Partition Key
    ],
    AttributeDefinitions: [
        { AttributeName: "connection_id", AttributeType: "S" },
        { AttributeName: "match_id", AttributeType: "S" }, // Dùng cho GSI
    ],
    GlobalSecondaryIndexes: [
        {
            IndexName: "match_id-index",
            KeySchema: [
                { AttributeName: "match_id", KeyType: "HASH" },
            ],
            Projection: {
                // Chỉ project connection_id và user_id để tối ưu chi phí đọc
                ProjectionType: "INCLUDE",
                NonKeyAttributes: ["user_id"],
            },
        },
    ],
    Tags: [
        { Key: "Project", Value: "TCG-AWS" },
        { Key: "Table", Value: "Connections" },
    ],
};

// ── Helper Functions ─────────────────────────────────────────────────────────

/**
 * Kiểm tra bảng đã tồn tại trên AWS chưa
 * @param {string} tableName
 * @returns {Promise<boolean>}
 */
async function tableExists(tableName) {
    try {
        await client.send(new DescribeTableCommand({ TableName: tableName }));
        return true;
    } catch (err) {
        if (err.name === "ResourceNotFoundException") return false;
        throw err;
    }
}

/**
 * Tạo một bảng DynamoDB và chờ đến khi bảng ACTIVE
 * @param {object} tableDefinition - CreateTable input object
 */
async function createTable(tableDefinition) {
    const tableName = tableDefinition.TableName;

    // Kiểm tra tồn tại trước để tránh lỗi ResourceInUseException
    if (await tableExists(tableName)) {
        console.log(`  Bảng "${tableName}" đã tồn tại — bỏ qua.`);
        return;
    }

    console.log(`  Đang tạo bảng "${tableName}"...`);
    await client.send(new CreateTableCommand(tableDefinition));

    // Chờ bảng chuyển sang trạng thái ACTIVE (tối đa 60 giây)
    await waitUntilTableExists(
        { client, maxWaitTime: 60 },
        { TableName: tableName }
    );

    console.log(`  Bảng "${tableName}" đã được tạo và ACTIVE.`);
}

/**
 * Bật TTL cho một bảng DynamoDB
 * @param {string} tableName - Tên bảng
 * @param {string} ttlAttributeName - Tên attribute chứa Unix timestamp TTL
 */
async function enableTTL(tableName, ttlAttributeName) {
    try {
        await client.send(
            new UpdateTimeToLiveCommand({
                TableName: tableName,
                TimeToLiveSpecification: {
                    Enabled: true,
                    AttributeName: ttlAttributeName,
                },
            })
        );
        console.log(
            `  TTL đã bật cho bảng "${tableName}" trên field "${ttlAttributeName}".`
        );
    } catch (err) {
        // Bỏ qua nếu TTL đã được bật trước đó
        if (
            err.name === "ValidationException" &&
            err.message.includes("already")
        ) {
            console.log(`  TTL trên "${tableName}" đã được bật trước đó.`);
        } else {
            throw err;
        }
    }
}

// ── Main: Chạy tuần tự để tránh throttle ────────────────────────────────────

async function main() {
    console.log("═══════════════════════════════════════════════════════════");
    console.log("  TCG-AWS — DynamoDB Table Setup Script");
    console.log(`  Region: ${process.env.AWS_REGION || "ap-southeast-1"}`);
    console.log("═══════════════════════════════════════════════════════════\n");

    // Kiểm tra credentials
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        console.error(
            "❌ Lỗi: Không tìm thấy AWS credentials.\n" +
            "   Hãy chắc chắn file .env tồn tại và có đủ AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION."
        );
        process.exit(1);
    }

    try {
        // ── Bước 1: Tạo bảng UserProfile ─────────────────────────────────────
        console.log("[1/4] UserProfile");
        await createTable(userProfileTableDef);
        console.log();

        // ── Bước 2: Tạo bảng GameState + bật TTL ─────────────────────────────
        console.log("[2/4] GameState");
        await createTable(gameStateTableDef);
        await enableTTL("GameState", "expire_at");
        console.log();

        // ── Bước 3: Tạo bảng GameLogs ────────────────────────────────────────
        console.log("[3/4] GameLogs");
        await createTable(gameLogsTableDef);
        console.log();

        // ── Bước 4: Tạo bảng Connections + bật TTL ───────────────────────────
        console.log("[4/4] Connections");
        await createTable(connectionsTableDef);
        await enableTTL("Connections", "expire_at");
        console.log();

        // ── Hoàn thành ────────────────────────────────────────────────────────
        console.log("═══════════════════════════════════════════════════════════");
        console.log("Tất cả bảng đã được thiết lập thành công!");
        console.log("═══════════════════════════════════════════════════════════");
        console.log();
        console.log("Bảng đã tạo:");
        console.log("    • UserProfile        (PK: user_id)");
        console.log("    • GameState          (PK: match_id | TTL: expire_at)");
        console.log("    • GameLogs           (PK: match_id | SK: action_sequence)");
        console.log("    • Connections        (PK: connection_id | TTL: expire_at | GSI: match_id-index)");
        console.log();
        console.log("  Lưu ý:");
        console.log("    - TTL trên GameState: 2 tiếng sau khi expire_at được set.");
        console.log("    - TTL trên Connections: 24 tiếng.");
        console.log("    - GSI match_id-index trên Connections dùng để broadcast.");
    } catch (err) {
        console.error("\nLỗi khi tạo bảng:", err.message);
        console.error("   Chi tiết:", err);
        process.exit(1);
    }
}

main();

