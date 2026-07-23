import { GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { SQSRecord } from "aws-lambda";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  notifyConnections: vi.fn()
}));
vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("../leaderboard/realtime", () => ({ notifyConnections: mocks.notifyConnections }));

import { processSingleMatchRecord } from "./postMatchWorker";

function record(): SQSRecord {
  return {
    messageId: "message-1",
    receiptHandle: "receipt",
    body: JSON.stringify({ matchId: "match-ranked", winnerId: "P2", endedAt: 123_456 }),
    attributes: {
      ApproximateReceiveCount: "1",
      SentTimestamp: "1",
      SenderId: "sender",
      ApproximateFirstReceiveTimestamp: "1"
    },
    messageAttributes: {},
    md5OfBody: "md5",
    eventSource: "aws:sqs",
    eventSourceARN: "arn:aws:sqs:ap-southeast-1:123:match-results",
    awsRegion: "ap-southeast-1"
  };
}

describe("postMatchWorker leaderboard projection", () => {
  beforeEach(() => vi.clearAllMocks());

  it("commits ELO, history and both GSI projections in one transaction", async () => {
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) {
        if (command.input.TableName === "GameState") {
          return {
            Item: {
              match_id: "match-ranked",
              status: "FINISHED",
              engine_state: { winnerId: "P1" },
              player_1: { user_id: "user-p1", connection_id: "connection-p1" },
              player_2: { user_id: "user-p2", connection_id: "connection-p2" }
            }
          };
        }
        const userId = command.input.Key?.user_id;
        return {
          Item: {
            user_id: userId,
            rank: userId === "user-p1" ? 10 : 11,
            stats: {
              wins: userId === "user-p1" ? 2 : 4,
              losses: 1,
              rank_points: 1000,
              elo_rating: 1000,
              exp: 900,
              level: 1
            }
          }
        };
      }
      if (command instanceof TransactWriteCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    await processSingleMatchRecord(record());

    const transaction = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof TransactWriteCommand) as TransactWriteCommand;
    const items = transaction.input.TransactItems!;
    expect(items).toHaveLength(5);
    expect(items[1].Update?.ExpressionAttributeValues).toMatchObject({
      ":scope": "GLOBAL",
      ":elo": 1016,
      ":winRate": 0.75,
      ":wins": 3,
      ":losses": 1
    });
    expect(items[2].Update?.ExpressionAttributeValues).toMatchObject({
      ":scope": "GLOBAL",
      ":elo": 984,
      ":wins": 4,
      ":losses": 2
    });
    expect(items[3].Put?.Item).toMatchObject({
      user_id: "user-p1",
      match_id: "match-ranked",
      result: "WIN",
      elo_change: 16
    });
    expect(mocks.notifyConnections).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({
        connectionId: "connection-p1",
        payload: expect.objectContaining({
          event: "profile:updated",
          elo: 1016,
          rank: 10,
          rankPending: true
        })
      })
    ]));
  });

  it("keeps SQS redelivery idempotent", async () => {
    mocks.dynamoSend.mockResolvedValue({
      Item: {
        match_id: "match-ranked",
        status: "FINISHED",
        post_match_processed_at: 999
      }
    });

    await processSingleMatchRecord(record());
    expect(mocks.dynamoSend).toHaveBeenCalledTimes(1);
    expect(mocks.notifyConnections).not.toHaveBeenCalled();
  });
});
