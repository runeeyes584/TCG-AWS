import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  NotAuthorizedException,
  PasswordResetRequiredException,
  UserLambdaValidationException,
  UserNotFoundException
} from "@aws-sdk/client-cognito-identity-provider";

const {
  cognitoSend,
  ensureUserProfile,
  verifyIdToken,
  verifyToken,
  activateSession,
  findPlayerConnections,
  evictConnections
} = vi.hoisted(() => {
  process.env.COGNITO_REGION = "ap-southeast-1";
  process.env.COGNITO_USER_POOL_ID = "pool";
  process.env.COGNITO_CLIENT_ID = "client";
  return {
    cognitoSend: vi.fn(),
    ensureUserProfile: vi.fn(),
    verifyIdToken: vi.fn(),
    verifyToken: vi.fn(),
    activateSession: vi.fn(),
    findPlayerConnections: vi.fn(),
    evictConnections: vi.fn()
  };
});

vi.mock("./cognito", () => ({ cognito: { send: cognitoSend } }));
vi.mock("./verifyToken", () => ({ verifyIdToken, verifyToken }));
vi.mock("../session/activeSession", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../session/activeSession")>()),
  activateSession
}));
vi.mock("../session/connectionEviction", () => ({ findPlayerConnections, evictConnections }));
// The client secret comes from SSM when Back-end/.env names a parameter; a test must not depend on that file or the network.
vi.mock("./clientSecret", () => ({ getClientSecret: async () => undefined }));
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
    verifyToken.mockReset();
    activateSession.mockReset();
    findPlayerConnections.mockReset();
    evictConnections.mockReset();
    verifyToken.mockResolvedValue({ sub: "new-sub", origin_jti: "session-new" });
    findPlayerConnections.mockResolvedValue([]);
    delete process.env.WS_MANAGEMENT_ENDPOINT;
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

  const signIn = () => {
    cognitoSend.mockResolvedValue({ AuthenticationResult: { AccessToken: "a", IdToken: "i", RefreshToken: "r" } });
    verifyIdToken.mockResolvedValue({ sub: "new-sub", email: "ace@example.com", preferred_username: "Ace" });
    return login({ email: "ace@example.com", password: "pw" });
  };

  it("makes this sign-in the player's only active session", async () => {
    await signIn();

    expect(activateSession).toHaveBeenCalledWith("new-sub", "session-new");
  });

  it("pushes out the connections of the earlier sign-in, as replaced from another device", async () => {
    process.env.WS_MANAGEMENT_ENDPOINT = "https://ws.example/dev";
    const old = [{ connectionId: "c1", sessionId: "session-old" }];
    findPlayerConnections.mockResolvedValue(old);

    await signIn();

    expect(evictConnections).toHaveBeenCalledWith("https://ws.example/dev", old, expect.any(Function));
    expect(evictConnections.mock.calls[0][2](old[0])).toBe("device");
  });

  it("still signs in when the old connections cannot be pushed out", async () => {
    process.env.WS_MANAGEMENT_ENDPOINT = "https://ws.example/dev";
    findPlayerConnections.mockRejectedValueOnce(new Error("no permission"));
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(signIn()).resolves.toMatchObject({ accessToken: "a" });
  });
});
