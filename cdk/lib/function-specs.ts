import type { TableKey } from "./config";

export type TableAccess = "read" | "readWrite";

/**
 * What one Lambda function is and what it reaches. The stack derives both its environment variables and its IAM
 * permissions from this, so a function can never have a variable without the permission behind it, or the reverse.
 */
export interface FunctionSpec {
  /** Construct id; also the stable logical name in the template. */
  readonly id: string;
  /** The existing function name. Never change it: API Gateway and the schedules call the function by it. */
  readonly functionName: string;
  /** Handler file under `Back-end/src/aws-lambdas/`. */
  readonly entry: string;
  readonly memorySize: number;
  readonly timeoutSeconds: number;
  readonly tables: Readonly<Partial<Record<TableKey, TableAccess>>>;
  /**
   * Sends messages to players' open WebSocket connections through the API Gateway Management API
   * (`WS_MANAGEMENT_ENDPOINT`, `execute-api:ManageConnections`). This is about what the function calls, not about
   * which API invokes it: the HTTP backend, invoked by the HTTP API, also pushes `match:ended` and profile events.
   */
  readonly pushesToWebSocket?: boolean;
  /**
   * The per-match turn-timeout schedule: `manage` creates, moves and deletes it (and names the target and role);
   * `cancel` may only delete it, when a match ends outside the game engine.
   */
  readonly turnTimeouts?: "manage" | "cancel";
  /** Queues finished matches for the ELO worker (`SQS_MATCH_RESULTS_QUEUE_URL`). */
  readonly sendsMatchResults?: boolean;
  /** Reads the finished-match queue (through the existing SQS trigger). */
  readonly consumesMatchResults?: boolean;
  /** `verifier` only checks tokens; `client` also calls Cognito with the app client secret. */
  readonly cognito?: "verifier" | "client";
  /** Allowed browser origins (`FRONTEND_ORIGINS`). */
  readonly frontendOrigins?: boolean;
  /**
   * The WebSocket routes that invoke the function, each allowed to by its own resource policy. Only for functions
   * whose routes are added after the stack took the functions over: the routes made by hand before then still
   * invoke theirs through permissions made by hand, until the WebSocket API itself is adopted.
   */
  readonly webSocketRoutes?: readonly string[];
  /** Created by this stack rather than made by hand and adopted, so it has no place in the adoption template. */
  readonly createdByStack?: boolean;
}

export const HANDLE_TIMEOUT_FUNCTION_NAME = "HandleTimeout-function";

/** The game functions, with the memory and timeout they run with today. */
export const FUNCTION_SPECS: readonly FunctionSpec[] = [
  {
    id: "HttpBackend",
    functionName: "chrono-http-backend",
    entry: "httpBackend.ts",
    memorySize: 512,
    timeoutSeconds: 5,
    tables: {
      userProfile: "readWrite",
      accountDeletionCooldown: "readWrite",
      gameState: "readWrite",
      gameLogs: "readWrite",
      connections: "readWrite",
      // Written when a player moved from the old user pool signs in: their history is re-keyed (legacyAccount.ts).
      matchHistory: "readWrite"
    },
    pushesToWebSocket: true,
    // Forfeiting a pending match ends it here, so its schedule is removed here too.
    turnTimeouts: "cancel",
    sendsMatchResults: true,
    cognito: "client",
    frontendOrigins: true
  },
  {
    id: "StartMatch",
    functionName: "StartMatch-function",
    entry: "startMatch.ts",
    memorySize: 128,
    timeoutSeconds: 15,
    tables: { connections: "readWrite", gameState: "readWrite", userProfile: "read" },
    pushesToWebSocket: true,
    turnTimeouts: "manage"
  },
  {
    id: "ConnectHandler",
    functionName: "ConnectHandler-function",
    entry: "connectHandler.ts",
    memorySize: 128,
    timeoutSeconds: 15,
    tables: { connections: "readWrite", gameState: "readWrite", userProfile: "read" },
    // Pushes the player's other connections out (session:replaced) when they connect from somewhere else.
    pushesToWebSocket: true,
    cognito: "verifier"
  },
  {
    id: "ProcessGameEngine",
    functionName: "ProcessGameEngine-function",
    entry: "processGameEngine.ts",
    memorySize: 128,
    timeoutSeconds: 15,
    tables: { gameState: "readWrite", gameLogs: "readWrite" },
    pushesToWebSocket: true,
    turnTimeouts: "manage",
    sendsMatchResults: true
  },
  {
    id: "HandleTimeout",
    functionName: HANDLE_TIMEOUT_FUNCTION_NAME,
    entry: "handleTimeout.ts",
    memorySize: 256,
    timeoutSeconds: 10,
    tables: { gameState: "readWrite", gameLogs: "readWrite" },
    pushesToWebSocket: true,
    turnTimeouts: "manage",
    sendsMatchResults: true
  },
  {
    id: "EndMatch",
    functionName: "EndMatch-function",
    entry: "endMatch.ts",
    memorySize: 128,
    timeoutSeconds: 15,
    tables: { gameState: "readWrite", gameLogs: "readWrite" },
    pushesToWebSocket: true,
    sendsMatchResults: true
  },
  {
    id: "CancelMatch",
    functionName: "CancelMatch-function",
    entry: "cancelMatch.ts",
    memorySize: 128,
    timeoutSeconds: 3,
    tables: { connections: "readWrite", gameState: "readWrite" },
    pushesToWebSocket: true
  },
  {
    id: "DisconnectHandler",
    functionName: "DisconnectHandler-function",
    entry: "disconnectHandler.ts",
    memorySize: 128,
    timeoutSeconds: 15,
    tables: { connections: "readWrite", gameState: "readWrite" },
    pushesToWebSocket: true
  },
  {
    id: "PostMatchWorker",
    functionName: "PostMatchWorker-function",
    entry: "postMatchWorker.ts",
    memorySize: 128,
    timeoutSeconds: 15,
    tables: { gameState: "readWrite", matchHistory: "readWrite", userProfile: "readWrite" },
    pushesToWebSocket: true,
    consumesMatchResults: true
  },
  {
    id: "RebuildLeaderboard",
    functionName: "Rebuild_Leader_Board-function",
    entry: "rebuildLeaderboardRanks.ts",
    memorySize: 128,
    timeoutSeconds: 300,
    tables: { userProfile: "readWrite", connections: "read" },
    pushesToWebSocket: true
  },
  {
    id: "MatchChat",
    functionName: "MatchChat-function",
    entry: "matchChat.ts",
    memorySize: 128,
    timeoutSeconds: 5,
    // Reads who plays the match; counts each connection's messages on its own record.
    tables: { gameState: "read", connections: "readWrite" },
    pushesToWebSocket: true,
    webSocketRoutes: ["chat-send"],
    createdByStack: true
  }
];
