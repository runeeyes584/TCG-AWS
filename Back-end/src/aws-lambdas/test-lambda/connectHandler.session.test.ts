import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const mocks = vi.hoisted(() => {
  process.env.COGNITO_REGION = "ap-southeast-1";
  process.env.COGNITO_USER_POOL_ID = "ap-southeast-1_pool";
  process.env.COGNITO_CLIENT_ID = "client";
  return {
    send: vi.fn(),
    verifyToken: vi.fn(),
    findPlayerConnections: vi.fn(),
    evictConnections: vi.fn()
  };
});

vi.mock("../../config/dynamodb", () => ({ dynamoDb: { send: mocks.send } }));
vi.mock("../../auth/verifyToken", () => ({ verifyToken: mocks.verifyToken }));
vi.mock("../../session/connectionEviction", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../session/connectionEviction")>()),
  findPlayerConnections: mocks.findPlayerConnections,
  evictConnections: mocks.evictConnections
}));

import { handler } from "../connectHandler";

const event = (connectionId = "new-connection") => ({
  requestContext: { connectionId, domainName: "ws.example", stage: "dev" },
  queryStringParameters: { token: "token" }
}) as any;

/** The DynamoDB calls, in order, by kind. */
const calls = () => mocks.send.mock.calls.map(([command]) => command);

describe("ConnectHandler and the active session", () => {
  let order: string[];

  beforeEach(() => {
    order = [];
    mocks.send.mockReset();
    mocks.verifyToken.mockReset();
    mocks.findPlayerConnections.mockReset();
    mocks.evictConnections.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mocks.verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "session-new" });
    mocks.findPlayerConnections.mockResolvedValue([
      { connectionId: "new-connection", sessionId: "session-new" },
      { connectionId: "other-tab", sessionId: "session-new" },
      { connectionId: "old-device", sessionId: "session-old" }
    ]);
    mocks.evictConnections.mockImplementation(async () => {
      order.push("evict");
      return 2;
    });
    mocks.send.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: { user_id: "user-1", username: "Ace", active_session: "session-new" } };
      if (command instanceof ScanCommand) {
        const filter = String((command as ScanCommand).input.FilterExpression);
        return filter.includes(":active")
          ? { Items: [{ match_id: "match-1", status: "IN_PROGRESS", player_1: { user_id: "user-1" }, engine_state: {} }] }
          : { Items: [] };
      }
      if (command instanceof UpdateCommand && (command as UpdateCommand).input.TableName === "GameState") order.push("bind-match");
      return {};
    });
  });

  it("refuses a session that a later sign-in replaced, without registering the connection", async () => {
    mocks.verifyToken.mockResolvedValue({ sub: "user-1", origin_jti: "session-old" });

    const result = await handler(event());

    expect(result).toMatchObject({ statusCode: 401, body: "SESSION_REPLACED" });
    expect(calls().some((command) => command instanceof PutCommand)).toBe(false);
    expect(mocks.evictConnections).not.toHaveBeenCalled();
  });

  it("records the session of the connection", async () => {
    await handler(event());

    const put = calls().find((command) => command instanceof PutCommand) as PutCommand;
    expect(put.input.Item).toMatchObject({ connection_id: "new-connection", user_id: "user-1", session_id: "session-new" });
  });

  it("pushes the player's other connections out, telling another tab `tab` and an earlier sign-in `device`", async () => {
    const result = await handler(event());

    expect(result).toMatchObject({ statusCode: 200 });
    const [endpoint, others, reasonFor] = mocks.evictConnections.mock.calls[0];
    expect(endpoint).toBe("https://ws.example/dev");
    expect(others.map((connection: any) => connection.connectionId)).toEqual(["other-tab", "old-device"]);
    expect(reasonFor(others[0])).toBe("tab");
    expect(reasonFor(others[1])).toBe("device");
  });

  it("binds the match to the new connection before pushing the old ones out", async () => {
    await handler(event());

    expect(order).toEqual(["bind-match", "evict"]);
  });

  it("still accepts the connection when pushing the others out fails", async () => {
    mocks.evictConnections.mockRejectedValueOnce(new Error("no permission"));

    expect(await handler(event())).toMatchObject({ statusCode: 200 });
  });

  it("lets a player connect whose profile has no session recorded yet", async () => {
    mocks.send.mockImplementation(async (command: unknown) =>
      command instanceof GetCommand ? { Item: { user_id: "user-1" } } : command instanceof ScanCommand ? { Items: [] } : {});

    expect(await handler(event())).toMatchObject({ statusCode: 200 });
  });
});
