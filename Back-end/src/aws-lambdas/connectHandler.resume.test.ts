import { PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  verifyToken: vi.fn()
}));

vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("../auth/verifyToken", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("../config/env", () => ({
  env: {
    region: "ap-southeast-1",
    userPoolId: "ap-southeast-1_pool",
    clientId: "client"
  }
}));

import { handler } from "./connectHandler";

describe("connectHandler resume discovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyToken.mockResolvedValue({ sub: "user-p1", username: "Player One" });
  });

  it("rebinds the connection but waits for explicit Continue", async () => {
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof PutCommand) return {};
      if (command instanceof ScanCommand) {
        return {
          Items: [{
            match_id: "match-active",
            status: "IN_PROGRESS",
            player_1: { user_id: "user-p1", connection_id: "old-connection", connected: false },
            player_2: { user_id: "user-p2", connection_id: "opponent", connected: true }
          }]
        };
      }
      if (command instanceof UpdateCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler({
      requestContext: { connectionId: "new-connection" },
      queryStringParameters: { token: "valid-token" },
      headers: {},
      isBase64Encoded: false
    } as any);

    expect(result.statusCode).toBe(200);
    const updates = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .filter((command) => command instanceof UpdateCommand) as UpdateCommand[];
    expect(updates).toHaveLength(2);
    expect(updates[0].input.ExpressionAttributeValues).toMatchObject({
      ":connectionId": "new-connection",
      ":connected": false
    });
    expect(updates[1].input.UpdateExpression).toContain("resume_required");
    expect(updates[1].input.ExpressionAttributeValues).toMatchObject({
      ":matchId": "match-active",
      ":resumeRequired": true
    });
  });
});
