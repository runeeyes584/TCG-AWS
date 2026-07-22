import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultDeckCardIds } from "../game/entities/defaultDeck";

const mocks = vi.hoisted(() => ({
  dynamoSend: vi.fn(),
  websocketSend: vi.fn(),
  saveUserDeck: vi.fn(),
  listUserDecks: vi.fn()
}));

vi.mock("../config/dynamodb", () => ({ dynamoDb: { send: mocks.dynamoSend } }));
vi.mock("../user/user.repository", () => ({
  saveUserDeck: mocks.saveUserDeck,
  listUserDecks: mocks.listUserDecks
}));
vi.mock("@aws-sdk/client-apigatewaymanagementapi", () => ({
  ApiGatewayManagementApiClient: class { send = mocks.websocketSend; },
  PostToConnectionCommand: class { constructor(public input: any) {} }
}));

import { handler } from "./saveDeck";

describe("saveDeck Lambda", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dynamoSend.mockImplementation(async (command: unknown) => {
      if (command instanceof GetCommand) return { Item: { user_id: "user-1" } };
      throw new Error("Unexpected DynamoDB command.");
    });
    mocks.websocketSend.mockResolvedValue({});
  });

  it("saves a valid deck for the user authenticated by the connection", async () => {
    const payload = {
      deckId: "deck-alpha",
      deckName: "Alpha",
      cardIds: getDefaultDeckCardIds()
    };
    mocks.saveUserDeck.mockResolvedValue({ ...payload, updatedAt: 123 });

    const result = await handler({
      requestContext: { connectionId: "connection-1", domainName: "socket.test", stage: "dev" },
      body: JSON.stringify({ route: "deck-builder", ...payload })
    });

    expect(result.statusCode).toBe(200);
    expect(mocks.saveUserDeck).toHaveBeenCalledWith("user-1", payload);
    const message = JSON.parse(mocks.websocketSend.mock.calls[0][0].input.Data.toString());
    expect(message).toMatchObject({ success: true, event: "deck:saved" });
  });

  it("lists the authenticated user's DynamoDB decks", async () => {
    mocks.listUserDecks.mockResolvedValue([{ deckId: "deck-alpha", updatedAt: 123 }]);

    const result = await handler({
      requestContext: { connectionId: "connection-1", domainName: "socket.test", stage: "dev" },
      body: JSON.stringify({ route: "deck-builder", action: "list" })
    });

    expect(result.statusCode).toBe(200);
    expect(mocks.listUserDecks).toHaveBeenCalledWith("user-1");
    const message = JSON.parse(mocks.websocketSend.mock.calls[0][0].input.Data.toString());
    expect(message).toMatchObject({ success: true, event: "deck:list" });
  });

  it("rejects the reserved default deck ID", async () => {
    const result = await handler({
      requestContext: { connectionId: "connection-1", domainName: "socket.test", stage: "dev" },
      body: JSON.stringify({
        route: "deck-builder",
        deckId: "kaleidoscope-starter",
        deckName: "Override",
        cardIds: getDefaultDeckCardIds()
      })
    });

    expect(result.statusCode).toBe(400);
    expect(mocks.saveUserDeck).not.toHaveBeenCalled();
  });
});
