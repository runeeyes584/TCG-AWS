import { beforeEach, describe, expect, it, vi } from "vitest";

const { dynamoSend, gatewaySend } = vi.hoisted(() => ({ dynamoSend: vi.fn(), gatewaySend: vi.fn() }));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: dynamoSend } }));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = gatewaySend; },
  PostToConnectionCommand: class { readonly kind = "post"; constructor(public input: any) {} },
  DeleteConnectionCommand: class { readonly kind = "delete"; constructor(public input: any) {} }
}));

import { evictConnections, findPlayerConnections, replacedReason } from "./connectionEviction";

const gone = () => Object.assign(new Error("gone"), { name: "GoneException" });

describe("finding a player's connections", () => {
  beforeEach(() => dynamoSend.mockReset());

  it("reads the user index", async () => {
    dynamoSend.mockResolvedValue({ Items: [{ connection_id: "c1", user_id: "u", session_id: "s1" }, { connection_id: "c2", user_id: "u" }] });

    const connections = await findPlayerConnections("u");

    expect(connections).toEqual([{ connectionId: "c1", sessionId: "s1" }, { connectionId: "c2" }]);
    expect(dynamoSend.mock.calls[0][0].input).toMatchObject({ IndexName: "UserIndex", KeyConditionExpression: "user_id = :userId" });
  });

  it("scans the table while the index does not exist yet", async () => {
    dynamoSend
      .mockRejectedValueOnce(Object.assign(new Error("The table does not have the specified index: UserIndex"), { name: "ValidationException" }))
      .mockResolvedValueOnce({ Items: [{ connection_id: "c1", user_id: "u" }] });

    expect(await findPlayerConnections("u")).toEqual([{ connectionId: "c1" }]);
    expect(dynamoSend.mock.calls[1][0].input).toMatchObject({ FilterExpression: "user_id = :userId" });
  });

  it("does not hide any other failure", async () => {
    dynamoSend.mockRejectedValueOnce(Object.assign(new Error("throttled"), { name: "ProvisionedThroughputExceededException" }));

    await expect(findPlayerConnections("u")).rejects.toThrow("throttled");
  });
});

describe("pushing connections out", () => {
  beforeEach(() => gatewaySend.mockReset());

  it("tells each connection why, then closes it", async () => {
    gatewaySend.mockResolvedValue({});

    const evicted = await evictConnections("https://ws.example/dev/", [{ connectionId: "c1" }, { connectionId: "c2" }], () => "device");

    expect(evicted).toBe(2);
    const calls = gatewaySend.mock.calls.map(([command]) => [command.kind, command.input.ConnectionId]);
    expect(calls).toEqual([["post", "c1"], ["delete", "c1"], ["post", "c2"], ["delete", "c2"]]);
    expect(JSON.parse(String(gatewaySend.mock.calls[0][0].input.Data))).toEqual({ event: "session:replaced", reason: "device" });
  });

  it("skips a connection that is already gone and carries on", async () => {
    gatewaySend.mockRejectedValueOnce(gone()).mockResolvedValue({});

    const evicted = await evictConnections("https://ws.example/dev", [{ connectionId: "dead" }, { connectionId: "c2" }], () => "tab");

    expect(evicted).toBe(1);
  });

  it("does nothing without connections", async () => {
    expect(await evictConnections("https://ws.example/dev", [], () => "tab")).toBe(0);
    expect(gatewaySend).not.toHaveBeenCalled();
  });
});

describe("the reason given to a pushed-out connection", () => {
  const reasonFor = replacedReason("s1");

  it("is `tab` for another tab of the same sign-in and `device` for an earlier sign-in", () => {
    expect(reasonFor({ connectionId: "c1", sessionId: "s1" })).toBe("tab");
    expect(reasonFor({ connectionId: "c2", sessionId: "s0" })).toBe("device");
    expect(reasonFor({ connectionId: "c3" })).toBe("device");
  });

  it("is `device` when the new connection has no session to compare", () => {
    expect(replacedReason(undefined)({ connectionId: "c1", sessionId: "s1" })).toBe("device");
  });
});
