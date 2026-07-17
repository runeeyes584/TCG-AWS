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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, "../.env") });
dotenv.config({ path: resolve(__dirname, "../Back-end/.env") });

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

const userProfileTableDef = {
    TableName: "UserProfile",
    BillingMode: "PAY_PER_REQUEST", 
    KeySchema: [
        { AttributeName: "user_id", KeyType: "HASH" }, 
    ],
    AttributeDefinitions: [
        { AttributeName: "user_id", AttributeType: "S" },
    ],
    Tags: [
        { Key: "Project", Value: "TCG-AWS" },
        { Key: "Table", Value: "UserProfile" },
    ],
};

const gameStateTableDef = {
    TableName: "GameState",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
        { AttributeName: "match_id", KeyType: "HASH" }, 
    ],
    AttributeDefinitions: [
        { AttributeName: "match_id", AttributeType: "S" },
    ],
    Tags: [
        { Key: "Project", Value: "TCG-AWS" },
        { Key: "Table", Value: "GameState" },
    ],
};

const gameLogsTableDef = {
    TableName: "GameLogs",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
        { AttributeName: "match_id", KeyType: "HASH" },        
        { AttributeName: "action_sequence", KeyType: "RANGE" }, 
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

const connectionsTableDef = {
    TableName: "Connections",
    BillingMode: "PAY_PER_REQUEST",
    KeySchema: [
        { AttributeName: "connection_id", KeyType: "HASH" }, 
    ],
    AttributeDefinitions: [
        { AttributeName: "connection_id", AttributeType: "S" },
        { AttributeName: "match_id", AttributeType: "S" }, 
    ],
    GlobalSecondaryIndexes: [
        {
            IndexName: "match_id-index",
            KeySchema: [
                { AttributeName: "match_id", KeyType: "HASH" },
            ],
            Projection: {
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


/**
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
 * @param {object} tableDefinition - CreateTable input object
 */
async function createTable(tableDefinition) {
    const tableName = tableDefinition.TableName;

    if (await tableExists(tableName)) {
        console.log(`  Bảng "${tableName}" đã tồn tại.`);
        return;
    }

    console.log(`  Đang tạo bảng "${tableName}"...`);
    await client.send(new CreateTableCommand(tableDefinition));

    await waitUntilTableExists(
        { client, maxWaitTime: 60 },
        { TableName: tableName }
    );

    console.log(`  Bảng "${tableName}" đã được tạo và ACTIVE.`);
}

/**
 * @param {string} tableName 
 * @param {string} ttlAttributeName 
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
        console.log("[1/4] UserProfile");
        await createTable(userProfileTableDef);
        console.log();

        console.log("[2/4] GameState");
        await createTable(gameStateTableDef);
        await enableTTL("GameState", "expire_at");
        console.log();

        console.log("[3/4] GameLogs");
        await createTable(gameLogsTableDef);
        console.log();

        console.log("[4/4] Connections");
        await createTable(connectionsTableDef);
        await enableTTL("Connections", "expire_at");
        console.log();

        console.log("═══════════════════════════════════════════════════════════");
        console.log("Tất cả bảng đã được thiết lập thành công!");
        console.log("═══════════════════════════════════════════════════════════");
        console.log();
        console.log("Bảng đã tạo:");
        console.log("    • UserProfile        (PK: user_id)");
        console.log("    • GameState          (PK: match_id | TTL: expire_at)");
        console.log("    • GameLogs           (PK: match_id | SK: action_sequence)");
        console.log("    • Connections        (PK: connection_id | TTL: expire_at | GSI: match_id-index)");
    } catch (err) {
        console.error("\nLỗi khi tạo bảng:", err.message);
        console.error("   Chi tiết:", err);
        process.exit(1);
    }
}

main();

