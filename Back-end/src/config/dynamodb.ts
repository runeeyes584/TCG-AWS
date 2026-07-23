import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";

// ESM-compatible __dirname
let envDirname = process.cwd();
try {
  if (typeof import.meta !== "undefined" && import.meta.url) {
    envDirname = path.dirname(fileURLToPath(import.meta.url));
  }
} catch {
  // Fallback to process.cwd()
}

// Resolve .env từ thư mục gốc Back-end (chỉ load nếu đang chạy local, không chạy trên AWS Lambda)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config({
    path: path.resolve(envDirname, "../../.env"),
  });
}

// Cache biến lưu credentials để tối ưu hoá cold start (không gọi Secrets Manager lặp lại vô ích)
let cachedCredentials: any = null;
const isLambdaRuntime = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
const hasLegacyCustomCredentialSettings = Boolean(
  process.env.DB_SECRET_NAME ||
  process.env.DB_SECRET_KEY ||
  process.env.CROSS_ACCOUNT_ROLE_ARN ||
  process.env.DB_ACCESS_KEY_ID
);

// A Lambda should normally use only its execution role. A DB secret often
// contains database login credentials, not AWS access keys, and must not
// silently replace the execution role. Cross-account/static credentials remain
// available, but require an explicit opt-in.
const usesCustomCredentials = process.env.DYNAMODB_CREDENTIAL_MODE === "custom" ||
  (!isLambdaRuntime && hasLegacyCustomCredentialSettings);

if (isLambdaRuntime && hasLegacyCustomCredentialSettings && !usesCustomCredentials) {
  console.info(
    "DynamoDB is using the Lambda execution role. " +
    "Set DYNAMODB_CREDENTIAL_MODE=custom only for an intentional cross-account credential source."
  );
}

const getCredentials = async (): Promise<any> => {
  if (cachedCredentials) {
    return cachedCredentials;
  }

  // PHƯƠNG ÁN 1: Sử dụng AWS Secrets Manager (Mã hóa bởi KMS) - Phương án chính
  const secretName = process.env.DB_SECRET_NAME || process.env.DB_SECRET_KEY;
  if (secretName) {
    try {
      const { SecretsManagerClient, GetSecretValueCommand } = await import("@aws-sdk/client-secrets-manager");
      const clientRegion = process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1";
      const smClient = new SecretsManagerClient({ region: clientRegion });

      console.log(`[SecretsManager] Đang tải credentials từ Secret: ${secretName}...`);
      const response = await smClient.send(
        new GetSecretValueCommand({ SecretId: secretName })
      );

      if (response.SecretString) {
        const secretObj = JSON.parse(response.SecretString);
        const accessKeyId = secretObj.accessKeyId || secretObj.AWS_ACCESS_KEY_ID;
        const secretAccessKey = secretObj.secretAccessKey || secretObj.AWS_SECRET_ACCESS_KEY;
        if (!accessKeyId || !secretAccessKey) {
          throw new Error(
            "The configured DynamoDB credential secret does not contain AWS accessKeyId and secretAccessKey."
          );
        }
        cachedCredentials = {
          accessKeyId,
          secretAccessKey,
          ...(secretObj.sessionToken && { sessionToken: secretObj.sessionToken })
        };
        console.log("[SecretsManager] Tải credentials thành công!");
        return cachedCredentials;
      }
    } catch (err) {
      console.error("[SecretsManager] Lỗi khi lấy Secret, đang thử dùng các phương án dự phòng:", err);
    }
  }

  // PHƯƠNG ÁN 2: Sử dụng Cross-Account IAM Role (AssumeRole)
  const crossAccountRoleArn = process.env.CROSS_ACCOUNT_ROLE_ARN;
  if (crossAccountRoleArn) {
    try {
      console.log(`[AssumeRole] Đang cấu hình Credentials Provider cho Role: ${crossAccountRoleArn}`);
      cachedCredentials = fromTemporaryCredentials({
        params: {
          RoleArn: crossAccountRoleArn,
          RoleSessionName: "ChronoGameBackendSession"
        },
        clientConfig: { region: process.env.DB_REGION || "ap-southeast-1" }
      });
      return cachedCredentials;
    } catch (err) {
      console.error("[AssumeRole] Lỗi khi tạo AssumeRole credentials provider:", err);
    }
  }

  // PHƯƠNG ÁN 3: Sử dụng Key tĩnh của đối tác (Local .env hoặc Biến môi trường Lambda)
  if (process.env.DB_ACCESS_KEY_ID) {
    cachedCredentials = {
      accessKeyId: process.env.DB_ACCESS_KEY_ID,
      secretAccessKey: process.env.DB_SECRET_ACCESS_KEY || "",
      ...(process.env.DB_SESSION_TOKEN && {
        sessionToken: process.env.DB_SESSION_TOKEN,
      }),
    };
    return cachedCredentials;
  }

  // PHƯƠNG ÁN 4: Sử dụng credentials mặc định của Lambda Role hiện tại
  throw new Error("Custom DynamoDB credentials were requested but could not be resolved.");
};

const client = new DynamoDBClient({
  region: process.env.DB_REGION || process.env.AWS_REGION || "ap-southeast-1",
  // Omit credentials in Lambda so the AWS SDK uses the function execution role.
  ...(usesCustomCredentials ? { credentials: getCredentials } : {})
});

export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: true
  }
});
export { client as dynamoDbClient };
