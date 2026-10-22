/**
 * The one place for the identifiers of the resources this stack does not create (yet) and for the settings shared
 * by the whole stack. Read it before changing anything else.
 */
export const ENVIRONMENT = {
  account: "977233000065",
  region: "ap-southeast-1"
} as const;

export const STACK_NAME = "ChronoGenesis";

/** DynamoDB tables; the names are the defaults the backend uses, so the functions need no table variables. */
export const TABLE_NAMES = {
  userProfile: "UserProfile",
  gameState: "GameState",
  gameLogs: "GameLogs",
  connections: "Connections",
  matchHistory: "MatchHistory",
  accountDeletionCooldown: "AccountDeletionCooldown"
} as const;

export type TableKey = keyof typeof TABLE_NAMES;

export const MATCH_RESULTS_QUEUE_NAME = "Match-Result-queue";

/** Resources created by hand that the functions use; adopted by a later phase of the stack. */
export const EXISTING = {
  /** The role every function shares today; used only while adopting the functions (`-c adopt=true`). */
  sharedExecutionRoleArn: `arn:aws:iam::${ENVIRONMENT.account}:role/Chrono-Lambda-Execution-Role`,
  webSocket: {
    apiId: "r953911p86",
    stage: "dev"
  },
  cognito: {
    region: "ap-southeast-1",
    userPoolId: "ap-southeast-1_nwGt4qcaV",
    clientId: "48rjrvog21he1937bnosvvk353",
    /** SecureString holding the app client secret (read by the backend at start-up). */
    clientSecretParameter: "/chrono/prod/cognito/client-secret"
  },
  frontendOrigins: [
    "https://dev.d3oenyc702mfnb.amplifyapp.com",
    "https://main.d3oenyc702mfnb.amplifyapp.com"
  ],
  /** Group of the one-time turn-timeout schedules the backend creates (`turn-<matchId>`). */
  turnTimeoutScheduleGroup: "default"
} as const;

export const webSocketManagementEndpoint =
  `https://${EXISTING.webSocket.apiId}.execute-api.${ENVIRONMENT.region}.amazonaws.com/${EXISTING.webSocket.stage}`;

/** Built from names, not from the resources, so that a function can name itself without a dependency cycle. */
export const functionArn = (functionName: string) =>
  `arn:aws:lambda:${ENVIRONMENT.region}:${ENVIRONMENT.account}:function:${functionName}`;
