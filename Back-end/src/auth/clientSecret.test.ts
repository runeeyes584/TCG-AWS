import { beforeEach, describe, expect, it, vi } from "vitest";

const { ssmSend, env } = vi.hoisted(() => ({
  ssmSend: vi.fn(),
  env: {
    region: "ap-southeast-1",
    clientId: "client",
    clientSecret: undefined as string | undefined,
    clientSecretParameter: undefined as string | undefined
  }
}));

vi.mock("../config/env", () => ({ env }));
vi.mock("@aws-sdk/client-ssm", () => ({
  SSMClient: class { send = ssmSend; },
  GetParameterCommand: class { constructor(public input: unknown) {} }
}));

describe("Cognito client secret", () => {
  beforeEach(() => {
    vi.resetModules();
    ssmSend.mockReset();
    env.clientSecret = undefined;
    env.clientSecretParameter = undefined;
  });

  it("uses COGNITO_CLIENT_SECRET when no parameter is named (local runs)", async () => {
    env.clientSecret = "local-secret";
    const { getClientSecret } = await import("./clientSecret");

    await expect(getClientSecret()).resolves.toBe("local-secret");
    expect(ssmSend).not.toHaveBeenCalled();
  });

  it("reads the SecureString once, decrypted, and reuses it", async () => {
    env.clientSecretParameter = "/chrono/prod/cognito/client-secret";
    ssmSend.mockResolvedValue({ Parameter: { Value: "ssm-secret" } });
    const { getClientSecret } = await import("./clientSecret");

    await expect(getClientSecret()).resolves.toBe("ssm-secret");
    await expect(getClientSecret()).resolves.toBe("ssm-secret");
    expect(ssmSend).toHaveBeenCalledTimes(1);
    expect(ssmSend.mock.calls[0][0].input).toEqual({ Name: "/chrono/prod/cognito/client-secret", WithDecryption: true });
  });

  it("does not cache a failed read: the next request tries again", async () => {
    env.clientSecretParameter = "/chrono/prod/cognito/client-secret";
    ssmSend.mockRejectedValueOnce(new Error("throttled")).mockResolvedValueOnce({ Parameter: { Value: "ssm-secret" } });
    const { getClientSecret } = await import("./clientSecret");

    await expect(getClientSecret()).rejects.toThrow("throttled");
    await expect(getClientSecret()).resolves.toBe("ssm-secret");
  });

  it("hashes with the secret from SSM", async () => {
    env.clientSecretParameter = "/chrono/prod/cognito/client-secret";
    ssmSend.mockResolvedValue({ Parameter: { Value: "ssm-secret" } });
    const { secretHashAuthParameters } = await import("./utils");
    const { createHmac } = await import("node:crypto");

    const expected = createHmac("sha256", "ssm-secret").update("ace@example.com" + "client").digest("base64");
    await expect(secretHashAuthParameters("ace@example.com")).resolves.toEqual({ SECRET_HASH: expected });
  });
});
