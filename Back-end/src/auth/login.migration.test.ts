import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotAuthorizedException,
  PasswordResetRequiredException,
  UserLambdaValidationException,
  UserNotFoundException
} from "@aws-sdk/client-cognito-identity-provider";

const { cognitoSend, ensureUserProfile, verifyIdToken } = vi.hoisted(() => {
  process.env.COGNITO_REGION = "ap-southeast-1";
  process.env.COGNITO_USER_POOL_ID = "pool";
  process.env.COGNITO_CLIENT_ID = "client";
  return { cognitoSend: vi.fn(), ensureUserProfile: vi.fn(), verifyIdToken: vi.fn() };
});

vi.mock("./cognito", () => ({ cognito: { send: cognitoSend } }));
vi.mock("./verifyToken", () => ({ verifyIdToken }));
vi.mock("../user/user.repository", () => ({
  ensureUserProfile,
  findUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  isEmailInDeletionCooldown: vi.fn()
}));

import { login } from "./auth.service";
import { getApiError } from "../http/error-response";

const cognitoError = <T>(Type: new (options: any) => T) => new Type({ message: "x", $metadata: {} });

describe("login against the new user pool", () => {
  beforeEach(() => {
    cognitoSend.mockReset();
    ensureUserProfile.mockReset();
    verifyIdToken.mockReset();
  });

  it("passes the old id carried by a moved player on to the profile", async () => {
    cognitoSend.mockResolvedValue({ AuthenticationResult: { AccessToken: "a", IdToken: "i", RefreshToken: "r" } });
    verifyIdToken.mockResolvedValue({
      sub: "new-sub",
      email: "Ace@Example.com",
      preferred_username: "Ace",
      "custom:legacy_sub": "legacy-sub"
    });

    await login({ email: "ace@example.com", password: "pw" });

    expect(ensureUserProfile).toHaveBeenCalledWith({
      id: "new-sub",
      email: "ace@example.com",
      username: "Ace",
      legacyId: "legacy-sub"
    });
  });

  it.each([
    ["a wrong password", NotAuthorizedException],
    ["an account the migration does not know", UserNotFoundException],
    ["a refusal of the migration trigger", UserLambdaValidationException]
  ])("answers %s as invalid credentials", async (_case, Type) => {
    cognitoSend.mockRejectedValue(cognitoError(Type as any));

    const error = await login({ email: "ace@example.com", password: "pw" }).catch((caught) => caught);

    expect(getApiError(error)).toMatchObject({ status: 401, code: "INVALID_CREDENTIALS" });
  });

  it("asks an imported player to reset their password", async () => {
    cognitoSend.mockRejectedValue(cognitoError(PasswordResetRequiredException));

    const error = await login({ email: "ace@example.com", password: "pw" }).catch((caught) => caught);

    expect(getApiError(error)).toMatchObject({ status: 409, code: "PASSWORD_RESET_REQUIRED" });
  });
});
