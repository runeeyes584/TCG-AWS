import { DeleteCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn()
}));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = mocks.websocketSend; },
  PostToConnectionCommand: class { constructor(public input: unknown) {} }
}));

import { handler } from "./cancelMatch";

const event = {
  requestContext: {
    connectionId: "connection-p1",
    domainName: "socket.example",
    stage: "dev"
  }
};

describe("cancelMatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.websocketSend.mockResolvedValue({});
  });

  it("does not delete an IN_PROGRESS match", async () => {
    mocks.dynamoSend
      .mockResolvedValueOnce({ Item: { match_id: "match-active" } })
      .mockResolvedValueOnce({ Item: { match_id: "match-active", status: "IN_PROGRESS" } });

    const result = await handler(event);

    expect(result.statusCode).toBe(409);
    expect(mocks.dynamoSend).toHaveBeenCalledTimes(2);
    expect(mocks.dynamoSend.mock.calls.some(([command]) => command instanceof DeleteCommand)).toBe(false);
  });

  it("deletes only the authenticated connection's WAITING queue item", async () => {
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) {
        return command.input.TableName === "Connections"
          ? { Item: { match_id: "queue-match" } }
          : { Item: {
              match_id: "queue-match",
              status: "WAITING",
              player_1: { connection_id: "connection-p1" }
            } };
      }
      if (command instanceof DeleteCommand || command instanceof UpdateCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    const deletion = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof DeleteCommand) as DeleteCommand;
    expect(deletion.input.ConditionExpression).toContain("player_1.connection_id = :connectionId");
    expect(mocks.websocketSend).toHaveBeenCalledTimes(1);
  });
});
