import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
let envDirname = process.cwd();
try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    envDirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  // Fallback to process.cwd()
}

// Resolve .env từ thư mục gốc Back-end
dotenv.config({
  path: path.resolve(envDirname, "../../.env"),
});

const getCredentials = () => {
  // Nếu sử dụng credentials tĩnh từ đối tác (DB_ACCESS_KEY_ID)
  if (process.env.DB_ACCESS_KEY_ID) {
    return {
      accessKeyId: process.env.DB_ACCESS_KEY_ID,
      secretAccessKey: process.env.DB_SECRET_ACCESS_KEY || "",
      ...(process.env.DB_SESSION_TOKEN && {
        sessionToken: process.env.DB_SESSION_TOKEN,
      }),
    };
  }

  // Nếu sử dụng credentials mặc định của Lambda Role
  return {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    ...(process.env.AWS_SESSION_TOKEN && {
      sessionToken: process.env.AWS_SESSION_TOKEN,
    }),
  };
};

const client = new DynamoDBClient({
  region: process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1",
  credentials: getCredentials()
});

export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});
export { client as dynamoDbClient };
