import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCardInstance, createUnitInstance } from "../game/entities/cards";
import type { CardDefinition, GameState, PlayerId } from "../game/types";
import { applyAction, createInitialGameState } from "../game/core/engine";

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

import { handler } from "./processGameEngine";

const fighter: CardDefinition = {
  id: "lambda-combat-fighter",
  name: "Lambda Combat Fighter",
  cost: 1,
  type: "unit",
  attack: 4,
  health: 3
};

function deck(playerId: PlayerId) {
  return Array.from({ length: 10 }, (_, index) =>
    createCardInstance(fighter, playerId, `${playerId}-lambda-${index}`)
  );
}

function blockingState(): GameState {
  let state = applyAction(createInitialGameState(deck("P1"), deck("P2"), 2), {
    type: "START_GAME",
    firstPlayerId: "P1"
  });
  state.players.P1.board = [
    createUnitInstance(createCardInstance(fighter, "P1", "lambda-attacker"))
  ];
  state = applyAction(state, {
    type: "DECLARE_ATTACKER",
    playerId: "P1",
    unitInstanceId: "lambda-attacker"
  });
  return applyAction(state, { type: "COMMIT_ATTACK", playerId: "P1" });
}

describe("processGameEngine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TURN_TIMEOUT_QUEUE_URL = "https://sqs.example/turn-timeouts";
    process.env.SQS_MATCH_RESULTS_QUEUE_URL = "https://sqs.example/match-results";
    mocks.websocketSend.mockResolvedValue({});
  });

  it("commits and publishes resolved combat without waiting for delayed SQS", async () => {
    const state = blockingState();
    const match = {
      match_id: "match-combat",
      status: "IN_PROGRESS",
      state_version: 7,
      engine_state: state,
      player_1: { user_id: "user-p1", connection_id: "connection-p1", connected: true },
      player_2: { user_id: "user-p2", connection_id: "connection-p2", connected: true }
    };
    let releaseSqs!: () => void;
    mocks.sqsSend.mockImplementation(() => new Promise<void>((resolve) => {
      releaseSqs = resolve;
    }));
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      if (command instanceof UpdateCommand || command instanceof PutCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const invocation = handler({
      requestContext: {
        connectionId: "connection-p2",
        domainName: "socket.example",
        stage: "dev"
      },
      body: JSON.stringify({
        matchId: match.match_id,
        action: { type: "COMMIT_BLOCKS", playerId: "P2" }
      })
    });

    await vi.waitFor(() => expect(mocks.websocketSend).toHaveBeenCalledTimes(2));
    const update = mocks.dynamoSend.mock.calls
      .map(([command]) => command)
      .find((command) => command instanceof UpdateCommand) as UpdateCommand;
    const committedState = update.input.ExpressionAttributeValues?.[":state"] as GameState;
    expect(committedState.phase).toBe("ACTION");
    expect(committedState.players.P2.nexusHp).toBe(16);

    releaseSqs();
    await expect(invocation).resolves.toMatchObject({ statusCode: 200 });
  });

  it("queues a natural lethal combat result for rank processing", async () => {
    const state = blockingState();
    state.players.P2.nexusHp = 4;
    const match = {
      match_id: "match-lethal",
      status: "IN_PROGRESS",
      state_version: 3,
      engine_state: state,
      player_1: { user_id: "user-p1", connection_id: "connection-p1", connected: true },
      player_2: { user_id: "user-p2", connection_id: "connection-p2", connected: true }
    };
    mocks.sqsSend.mockResolvedValue({});
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: match };
      if (command instanceof UpdateCommand || command instanceof PutCommand) return {};
      throw new Error("Unexpected DynamoDB command.");
    });

    const result = await handler({
      requestContext: {
        connectionId: "connection-p2",
        domainName: "socket.example",
        stage: "dev"
      },
      body: JSON.stringify({
        matchId: match.match_id,
        action: { type: "COMMIT_BLOCKS", playerId: "P2" }
      })
    });

    expect(result.statusCode).toBe(200);
    expect(mocks.sqsSend).toHaveBeenCalledTimes(1);
    const queued = JSON.parse(mocks.sqsSend.mock.calls[0][0].input.MessageBody);
    expect(queued).toMatchObject({
      matchId: "match-lethal",
      winnerId: "P1",
      player1: { userId: "user-p1" },
      player2: { userId: "user-p2" }
    });
  });
});
