import { beforeEach, describe, expect, it, vi } from "vitest";

const { cognitoSend, verifyToken, dynamoSend } = vi.hoisted(() => {
  process.env.COGNITO_REGION = "ap-southeast-1";
  process.env.COGNITO_USER_POOL_ID = "pool";
  process.env.COGNITO_CLIENT_ID = "client";
  return { cognitoSend: vi.fn(), verifyToken: vi.fn(), dynamoSend: vi.fn() };
});

vi.mock("./cognito", () => ({ cognito: { send: cognitoSend } }));
vi.mock("./verifyToken", () => ({ verifyToken, verifyIdToken: vi.fn() }));
vi.mock("./clientSecret", () => ({ getClientSecret: async () => undefined }));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: dynamoSend } }));

import { refresh } from "./auth.service";
import { SessionReplacedError } from "../session/activeSession";

describe("refreshing the access token", () => {
  beforeEach(() => {
    cognitoSend.mockReset();
    verifyToken.mockReset();
    dynamoSend.mockReset();
    cognitoSend.mockResolvedValue({ AuthenticationResult: { AccessToken: "fresh", ExpiresIn: 3600 } });
  });

  it("gives the active session a new token", async () => {
    verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "current" });
    dynamoSend.mockResolvedValue({ Item: { active_session: "current" } });

    await expect(refresh("refresh-token", "ace@example.com")).resolves.toMatchObject({ accessToken: "fresh" });
  });

  it("gives nothing to a session that a later sign-in replaced", async () => {
    verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "earlier" });
    dynamoSend.mockResolvedValue({ Item: { active_session: "current" } });

    await expect(refresh("refresh-token", "ace@example.com")).rejects.toBeInstanceOf(SessionReplacedError);
  });
});
