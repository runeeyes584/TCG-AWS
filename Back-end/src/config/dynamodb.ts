import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve .env từ thư mục gốc Back-end (2 cấp trên src/config/)
dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    ...(process.env.AWS_SESSION_TOKEN && {
      sessionToken: process.env.AWS_SESSION_TOKEN,
    }),
  },
});

export const dynamoDb = DynamoDBDocumentClient.from(client);
export { client as dynamoDbClient };
