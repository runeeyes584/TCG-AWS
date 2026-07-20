import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import path from "path";

dotenv.config({
  path: path.resolve(process.cwd(), "Back-end/.env"),
});

const client = new DynamoDBClient({
  region: process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.DB_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.DB_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY || ""
  }
});

export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});
export { client as dynamoDbClient };
