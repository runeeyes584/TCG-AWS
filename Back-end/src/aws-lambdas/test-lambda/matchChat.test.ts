import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn()
}));
vi.mock("../../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = mocks.websocketSend; },
  PostToConnectionCommand: class { constructor(public input: any) {} }
}));

import { handler } from "../matchChat";
import { CHAT_ERRORS, CHAT_RATE_LIMIT } from "../../shared/chat";

const requestContext = { connectionId: "conn-p1", domainName: "socket.example", stage: "dev" };
const chatEvent = (body: unknown, connectionId = "conn-p1") => ({
  requestContext: { ...requestContext, connectionId },
  body: typeof body === "string" ? body : JSON.stringify(body)
});

const match = (overrides: Record<string, unknown> = {}) => ({
  match_id: "M1",
  status: "IN_PROGRESS",
  player_1: { connection_id: "conn-p1", username: "Ann" },
  player_2: { connection_id: "conn-p2", username: "Bob" },
  ...overrides
});

const conditionFailed = () => Object.assign(new Error("condition"), { name: "ConditionalCheckFailedException" });

/** The match read, then the allowance writes in the order they are answered. */
function dynamo(item: unknown, ...allowance: Array<"ok" | "condition">) {
  mocks.dynamoSend.mockImplementation(async (command: unknown) => {
    if (command instanceof GetCommand) return { Item: item };
    if (command instanceof UpdateCommand) {
      const answer = allowance.shift() ?? "ok";
      if (answer === "condition") throw conditionFailed();
      return {};
    }
    throw new Error("Unexpected DynamoDB command.");
  });
}

/** What each connection was sent. */
const sent = () => mocks.websocketSend.mock.calls.map(([command]) => ({
  to: command.input.ConnectionId,
  payload: JSON.parse(String(command.input.Data))
}));

const updates = (): any[] => mocks.dynamoSend.mock.calls.map(([command]) => command).filter((command) => command instanceof UpdateCommand);

describe("matchChat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.websocketSend.mockResolvedValue({});
  });

  it("relays the message to both players, named by the match rather than by the browser", async () => {
    dynamo(match());

    const result = await handler(chatEvent({ matchId: "M1", text: "  gg   wp ", senderId: "P2", username: "Mallory" }));

    expect(result.statusCode).toBe(200);
    const deliveries = sent();
    expect(deliveries.map(({ to }) => to)).toEqual(["conn-p1", "conn-p2"]);
    for (const { payload } of deliveries) {
      expect(payload).toMatchObject({ event: "chat:message", senderId: "P1", username: "Ann", text: "gg wp" });
      expect(payload.id).toMatch(/^M1-/);
    }
    expect(deliveries[0].payload.id).toBe(deliveries[1].payload.id);
  });

  it("reads the match consistently, so a player who has just reconnected is recognised", async () => {
    dynamo(match({ player_2: { connection_id: "conn-new", username: "Bob" } }));

    const result = await handler(chatEvent({ matchId: "M1", text: "back" }, "conn-new"));

    expect(result.statusCode).toBe(200);
    const read = mocks.dynamoSend.mock.calls[0][0];
    expect(read.input).toMatchObject({ TableName: "GameState", Key: { match_id: "M1" }, ConsistentRead: true });
    expect(sent()[0].payload).toMatchObject({ senderId: "P2", username: "Bob" });
  });

  it("refuses an invalid message without reading anything", async () => {
    const result = await handler(chatEvent({ matchId: "M1", text: "   " }));

    expect(result.statusCode).toBe(400);
    expect(mocks.dynamoSend).not.toHaveBeenCalled();
    expect(sent()).toEqual([{ to: "conn-p1", payload: { event: "chat:error", message: CHAT_ERRORS.invalidText } }]);
  });

  it.each([
    ["a body that is not JSON", "{oops", 400],
    ["a body without a match", { text: "hi" }, 400]
  ])("refuses %s", async (_case, body, statusCode) => {
    const result = await handler(chatEvent(body));

    expect(result.statusCode).toBe(statusCode);
    expect(sent()[0].payload).toEqual({ event: "chat:error", message: CHAT_ERRORS.notInMatch });
  });

  it.each([
    ["an unknown match", undefined, 404, CHAT_ERRORS.notInMatch],
    ["a match still waiting for an opponent", match({ status: "WAITING", player_2: null }), 409, CHAT_ERRORS.waitingForOpponent],
    ["a finished match", match({ status: "FINISHED" }), 409, CHAT_ERRORS.matchEnded],
    ["a match the connection does not play in", match({ player_1: { connection_id: "conn-other" } }), 403, CHAT_ERRORS.notInMatch]
  ])("refuses a message to %s and tells only the sender", async (_case, item, statusCode, reason) => {
    dynamo(item);

    const result = await handler(chatEvent({ matchId: "M1", text: "hi" }));

    expect(result.statusCode).toBe(statusCode);
    expect(sent()).toEqual([{ to: "conn-p1", payload: { event: "chat:error", message: reason } }]);
    expect(updates()).toEqual([]);
  });

  it("opens a new allowance window on the sender's own connection record", async () => {
    dynamo(match());

    await handler(chatEvent({ matchId: "M1", text: "hi" }));

    const [open] = updates();
    expect(updates()).toHaveLength(1);
    expect(open.input).toMatchObject({
      TableName: "Connections",
      Key: { connection_id: "conn-p1" },
      UpdateExpression: "SET chat_window_start = :now, chat_count = :one"
    });
    expect(open.input.ExpressionAttributeValues[":now"] - open.input.ExpressionAttributeValues[":windowEdge"])
      .toBe(CHAT_RATE_LIMIT.windowMs);
  });

  it("counts a message inside an open window", async () => {
    dynamo(match(), "condition", "ok");

    const result = await handler(chatEvent({ matchId: "M1", text: "again" }));

    expect(result.statusCode).toBe(200);
    const [, count] = updates();
    expect(count.input).toMatchObject({ UpdateExpression: "ADD chat_count :one" });
    expect(count.input.ExpressionAttributeValues[":max"]).toBe(CHAT_RATE_LIMIT.maxMessages);
    expect(sent()).toHaveLength(2);
  });

  it("refuses a message once the window is full", async () => {
    dynamo(match(), "condition", "condition");

    const result = await handler(chatEvent({ matchId: "M1", text: "spam" }));

    expect(result.statusCode).toBe(429);
    expect(sent()).toEqual([{ to: "conn-p1", payload: { event: "chat:error", message: CHAT_ERRORS.tooFast } }]);
  });

  it("still delivers to the sender when the opponent has just left", async () => {
    dynamo(match());
    mocks.websocketSend.mockImplementation(async (command: any) => {
      if (command.input.ConnectionId === "conn-p2") throw Object.assign(new Error("gone"), { name: "GoneException" });
      return {};
    });

    const result = await handler(chatEvent({ matchId: "M1", text: "hello?" }));

    expect(result.statusCode).toBe(200);
    expect(mocks.websocketSend).toHaveBeenCalledTimes(2);
  });

  it("tells the sender chat is unavailable when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.dynamoSend.mockRejectedValueOnce(Object.assign(new Error("throttled"), { name: "ProvisionedThroughputExceededException" }));

    const result = await handler(chatEvent({ matchId: "M1", text: "hi" }));

    expect(result.statusCode).toBe(500);
    expect(sent()).toEqual([{ to: "conn-p1", payload: { event: "chat:error", message: CHAT_ERRORS.unavailable } }]);
  });

  it("answers nothing without a WebSocket request context", async () => {
    const result = await handler({ body: JSON.stringify({ matchId: "M1", text: "hi" }) });

    expect(result.statusCode).toBe(400);
    expect(mocks.websocketSend).not.toHaveBeenCalled();
  });
});
