import { describe, expect, it } from "vitest";
// @ts-expect-error The script is plain JavaScript run with node.
import { switchedEnvironment } from "./switch-lambda-config.mjs";

const partner = {
  DYNAMODB_CREDENTIAL_MODE: "custom",
  DB_SECRET_NAME: "ChronoGame/PartnerDB/Credentials",
  USER_PROFILE_TABLE: "UserProfile"
};

describe("switchedEnvironment", () => {
  it("drops the partner DynamoDB settings and keeps every other variable", () => {
    expect(switchedEnvironment("EndMatch-function", partner, "secret")).toEqual({ USER_PROFILE_TABLE: "UserProfile" });
  });

  it("points the Cognito functions at the new user pool", () => {
    const next = switchedEnvironment("chrono-http-backend", {
      ...partner,
      COGNITO_REGION: "ap-southeast-2",
      COGNITO_USER_POOL_ID: "ap-southeast-2_WM8KrQ2FM",
      COGNITO_CLIENT_ID: "old",
      COGNITO_CLIENT_SECRET: "old-secret",
      FRONTEND_ORIGINS: "https://example.com"
    }, "new-secret");

    expect(next).toEqual({
      USER_PROFILE_TABLE: "UserProfile",
      FRONTEND_ORIGINS: "https://example.com",
      COGNITO_REGION: "ap-southeast-1",
      COGNITO_USER_POOL_ID: "ap-southeast-1_nwGt4qcaV",
      COGNITO_CLIENT_ID: "48rjrvog21he1937bnosvvk353",
      COGNITO_CLIENT_SECRET: "new-secret"
    });
  });

  it("does not add Cognito settings to the other functions", () => {
    expect(switchedEnvironment("ProcessGameEngine-function", partner, "secret")).not.toHaveProperty("COGNITO_CLIENT_SECRET");
  });
});
