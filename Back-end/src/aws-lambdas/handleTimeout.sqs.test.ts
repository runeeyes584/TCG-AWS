import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSEvent } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAction, createInitialGameState } from "../game/core/engine";
import type { GameState } from "../game/types";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  sqsSend: vi.fn(),
  websocketSend: vi.fn()
}));

vi.mock("../config/dynamodb", () => ({
  dynamoDb: { send: mocks.dynamoSend }
}));

vi.mock("@aws-sdk/client-sqs", () => ({
  SQSClient: class {
    send = mocks.sqsSend;
  },
  SendMessageCommand: class {
    constructor(public input: unknown) {}
  }
}));

vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class {
    send = mocks.websocketSend;
  },
  PostToConnectionCommand: class {
    constructor(public input: unknown) {}
  }
}));

import { handler, type MatchRecord } from "./handleTimeout";

function dueState(): GameState {
  const state = applyAction(createInitialGameState([], [], 1), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.players.P1.nexusHp = 20;
  state.players.P2.nexusHp = 20;
  state.winnerId = undefined;
  state.turnStartTime = Date.now() - 30_100;
  state.turnDuration = 30_000;
  return state;
}

function sqsEvent(match: MatchRecord, stateVersion: number): SQSEvent {
  const state = match.engine_state;
  return {
    Records: [{
      messageId: "message-1",
      receiptHandle: "receipt",
      body: JSON.stringify({
        matchId: match.match_id,
        stateVersion,
        expectedPlayerId: state.priorityPlayerId,
        turnStartTime: state.turnStartTime,
        turnDuration: state.turnDuration,
        deadline: state.turnStartTime + state.turnDuration
      }),
      attributes: {
        ApproximateReceiveCount: "1",
        SentTimestamp: "1",
        SenderId: "sender",
        ApproximateFirstReceiveTimestamp: "1"
      },
      messageAttributes: {},
      md5OfBody: "md5",
      eventSource: "aws:sqs",
      eventSourceARN: "arn:aws:sqs:ap-southeast-1:123456789012:timeouts",
      awsRegion: "ap-southeast-1"
    }]
  };
}

describe("handleTimeout SQS consumer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TURN_TIMEOUT_QUEUE_URL = "https://sqs.example/turn-timeouts";
    process.env.WS_MANAGEMENT_ENDPOINT = "https://websocket.example/dev";
  });

  it("applies one due timeout and schedules the next authoritative turn", async () => {
    const match: MatchRecord = {
      match_id: "match-1",
      status: "IN_PROGRESS",
      state_version: 1,
      engine_state: dueState()
    };
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      if (command instanceof UpdateCommand || command instanceof PutCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler(sqsEvent(match, 1));

    expect(result.batchItemFailures).toEqual([]);
    expect(mocks.sqsSend).toHaveBeenCalledTimes(1);
    const update = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof UpdateCommand) as UpdateCommand;
    expect(update).toBeDefined();
    expect(update.input.ExpressionAttributeValues).toMatchObject({
      ":version": 1,
      ":nextVersion": 2,
      ":playerId": "P1",
      ":nextPlayerId": "P2"
    });
  });

  it("deletes a stale message without applying or scheduling anything", async () => {
    const match: MatchRecord = {
      match_id: "match-1",
      status: "IN_PROGRESS",
      state_version: 2,
      engine_state: dueState()
    };
    mocks.dynamoSend.mockResolvedValue({ Item: match });

    const result = await handler(sqsEvent(match, 1));

    expect(result.batchItemFailures).toEqual([]);
    expect(mocks.dynamoSend).toHaveBeenCalledTimes(1);
    expect(mocks.sqsSend).not.toHaveBeenCalled();
  });
});
