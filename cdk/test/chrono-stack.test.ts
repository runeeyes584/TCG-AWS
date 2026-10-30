import path from "node:path";
import { fileURLToPath } from "node:url";
import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { ChronoStack } from "../lib/chrono-stack";
import { ENVIRONMENT, MATCH_RESULTS_QUEUE_NAME, TABLE_NAMES } from "../lib/config";
import { FUNCTION_SPECS } from "../lib/function-specs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function synth(adopt: boolean): Template {
  // Bundling is skipped: these tests look at the template, not at the code.
  const app = new App({ context: { "aws:cdk:bundling-stacks": [] } });
  return Template.fromStack(new ChronoStack(app, "Test", { env: ENVIRONMENT, repoRoot, adopt }));
}

type Resource = { Type: string; Properties: Record<string, any>; DeletionPolicy?: string };

const resourcesOf = (template: Template): Record<string, Resource> => template.toJSON().Resources;

/** The statements of the inline policy attached to the role of one function. */
function statementsOf(template: Template, functionName: string): any[] {
  const resources = resourcesOf(template);
  const fn = Object.values(resources).find((resource) => resource.Properties.FunctionName === functionName)!;
  const roleId = fn.Properties.Role["Fn::GetAtt"][0];
  return Object.values(resources)
    .filter((resource) => resource.Type === "AWS::IAM::Policy" && resource.Properties.Roles.some((role: any) => role.Ref === roleId))
    .flatMap((policy) => policy.Properties.PolicyDocument.Statement);
}

/** The functions that existed before the stack: the only ones an import takes over. */
const ADOPTED_SPECS = FUNCTION_SPECS.filter((spec) => !spec.createdByStack);

const actionsOf = (statements: any[]) => statements.flatMap((statement) => [statement.Action].flat());
const environmentOf = (template: Template, functionName: string): Record<string, unknown> =>
  Object.values(resourcesOf(template)).find((resource) => resource.Properties.FunctionName === functionName)!
    .Properties.Environment?.Variables ?? {};

describe("adoption template (cdk import)", () => {
  const template = synth(true);
  const resources = Object.values(resourcesOf(template));

  it("holds nothing but the existing tables, queue and functions", () => {
    const types = new Set(resources.map((resource) => resource.Type));
    expect([...types].sort()).toEqual(["AWS::DynamoDB::Table", "AWS::Lambda::Function", "AWS::SQS::Queue"]);
    expect(resources).toHaveLength(6 + 1 + ADOPTED_SPECS.length);
  });

  it("retains every resource, so an import or a rollback never deletes one", () => {
    expect(resources.every((resource) => resource.DeletionPolicy === "Retain")).toBe(true);
  });

  it("names every resource exactly as it exists", () => {
    const names = (type: string, property: string) =>
      resources.filter((resource) => resource.Type === type).map((resource) => resource.Properties[property]).sort();
    expect(names("AWS::DynamoDB::Table", "TableName")).toEqual(Object.values(TABLE_NAMES).sort());
    expect(names("AWS::SQS::Queue", "QueueName")).toEqual([MATCH_RESULTS_QUEUE_NAME]);
    expect(names("AWS::Lambda::Function", "FunctionName")).toEqual(ADOPTED_SPECS.map((spec) => spec.functionName).sort());
    expect(names("AWS::Lambda::Function", "FunctionName")).not.toContain("MatchChat-function");
  });

  it("keeps the functions on the role they share today", () => {
    template.allResourcesProperties("AWS::Lambda::Function", {
      Role: "arn:aws:iam::977233000065:role/Chrono-Lambda-Execution-Role"
    });
  });
});

describe("managed template", () => {
  const template = synth(false);

  it("gives every function a role of its own", () => {
    const roles = Object.values(resourcesOf(template))
      .filter((resource) => resource.Type === "AWS::Lambda::Function")
      .map((resource) => JSON.stringify(resource.Properties.Role));
    expect(new Set(roles).size).toBe(FUNCTION_SPECS.length);
  });

  it("never grants DynamoDB on every table", () => {
    const tableWide = Object.values(resourcesOf(template))
      .filter((resource) => resource.Type === "AWS::IAM::Policy")
      .flatMap((policy) => policy.Properties.PolicyDocument.Statement)
      .filter((statement) => actionsOf([statement]).some((action) => action.startsWith("dynamodb:")))
      .filter((statement) => JSON.stringify(statement.Resource).includes("table/*"));
    expect(tableWide).toEqual([]);
  });

  it("lets the functions that end a match queue its result (the variable was missing on two of them)", () => {
    for (const functionName of ["ProcessGameEngine-function", "HandleTimeout-function", "EndMatch-function", "chrono-http-backend"]) {
      expect(environmentOf(template, functionName)).toHaveProperty("SQS_MATCH_RESULTS_QUEUE_URL");
      expect(actionsOf(statementsOf(template, functionName))).toContain("sqs:SendMessage");
    }
  });

  it("gives the Cognito client secret to the HTTP backend only, through SSM", () => {
    const http = environmentOf(template, "chrono-http-backend");
    expect(http).toMatchObject({ COGNITO_CLIENT_SECRET_PARAM: "/chrono/prod/cognito/client-secret" });
    expect(http).not.toHaveProperty("COGNITO_CLIENT_SECRET");
    expect(actionsOf(statementsOf(template, "chrono-http-backend"))).toContain("ssm:GetParameter");

    expect(environmentOf(template, "ConnectHandler-function")).not.toHaveProperty("COGNITO_CLIENT_SECRET_PARAM");
    expect(actionsOf(statementsOf(template, "ConnectHandler-function"))).not.toContain("ssm:GetParameter");
  });

  it("lets only the turn-clock functions schedule timeouts, with a role that may invoke HandleTimeout only", () => {
    const schedulers = FUNCTION_SPECS
      .filter((spec) => actionsOf(statementsOf(template, spec.functionName)).includes("scheduler:CreateSchedule"))
      .map((spec) => spec.functionName)
      .sort();
    expect(schedulers).toEqual(["HandleTimeout-function", "ProcessGameEngine-function", "StartMatch-function"]);

    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: [Match.objectLike({ Principal: { Service: "scheduler.amazonaws.com" } })]
      })
    });
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: [{
          Action: "lambda:InvokeFunction",
          Effect: "Allow",
          Resource: [
            "arn:aws:lambda:ap-southeast-1:977233000065:function:HandleTimeout-function",
            "arn:aws:lambda:ap-southeast-1:977233000065:function:HandleTimeout-function:*"
          ]
        }]
      }
    });
  });

  it("lets the HTTP backend re-key a moved player's match history (it writes MatchHistory, not only reads it)", () => {
    const statements = statementsOf(template, "chrono-http-backend");
    const historyWrites = statements.filter((statement) =>
      actionsOf([statement]).includes("dynamodb:PutItem") && JSON.stringify(statement.Resource).includes("DataMatchHistory"));
    expect(historyWrites).not.toEqual([]);
  });

  it("lets the HTTP backend delete a turn-timeout schedule when a match is forfeited, and nothing more", () => {
    const actions = actionsOf(statementsOf(template, "chrono-http-backend"));
    expect(actions).toContain("scheduler:DeleteSchedule");
    expect(actions).not.toContain("scheduler:CreateSchedule");
    expect(actions).not.toContain("iam:PassRole");
    expect(environmentOf(template, "chrono-http-backend")).not.toHaveProperty("TURN_TIMEOUT_SCHEDULER_ROLE_ARN");
  });

  it("lets the HTTP backend push to WebSocket connections: it is invoked by the HTTP API but notifies players", () => {
    expect(environmentOf(template, "chrono-http-backend")).toHaveProperty("WS_MANAGEMENT_ENDPOINT");
    expect(actionsOf(statementsOf(template, "chrono-http-backend"))).toContain("execute-api:ManageConnections");
    expect(environmentOf(template, "ConnectHandler-function")).not.toHaveProperty("WS_MANAGEMENT_ENDPOINT");
  });

  it("lets the chat-send route, and only that route of the game socket, invoke the chat function", () => {
    const permissions = Object.values(resourcesOf(template)).filter((resource) => resource.Type === "AWS::Lambda::Permission");
    expect(permissions).toHaveLength(1);
    expect(permissions[0].Properties).toMatchObject({
      Action: "lambda:InvokeFunction",
      Principal: "apigateway.amazonaws.com",
      SourceArn: "arn:aws:execute-api:ap-southeast-1:977233000065:r953911p86/dev/chat-send"
    });
    const chatFunctionId = Object.entries(resourcesOf(template))
      .find(([, resource]) => resource.Properties.FunctionName === "MatchChat-function")![0];
    expect(permissions[0].Properties.FunctionName).toEqual({ "Fn::GetAtt": [chatFunctionId, "Arn"] });
  });

  it("lets the chat function read matches, count messages on connections and push to players, and nothing more", () => {
    const statements = statementsOf(template, "MatchChat-function");
    const tablesOf = (action: string) => statements
      .filter((statement) => actionsOf([statement]).includes(action))
      .map((statement) => JSON.stringify(statement.Resource));
    expect(tablesOf("dynamodb:GetItem").join()).toMatch(/DataGameState/);
    expect(tablesOf("dynamodb:GetItem").join()).toMatch(/DataConnections/);
    expect(tablesOf("dynamodb:UpdateItem").join()).toMatch(/DataConnections/);
    expect(tablesOf("dynamodb:UpdateItem").join()).not.toMatch(/DataGameState/);
    expect(actionsOf(statements)).toContain("execute-api:ManageConnections");
    expect(actionsOf(statements).filter((action) => /^(sqs|scheduler|ssm|iam):/.test(action))).toEqual([]);
    expect(environmentOf(template, "MatchChat-function")).toEqual({
      WS_MANAGEMENT_ENDPOINT: "https://r953911p86.execute-api.ap-southeast-1.amazonaws.com/dev"
    });
  });

  it("keeps the tables as they are: keys, indexes, TTL, on demand, retained and protected", () => {
    template.hasResource("AWS::DynamoDB::Table", {
      DeletionPolicy: "Retain",
      Properties: Match.objectLike({
        TableName: "UserProfile",
        BillingMode: "PAY_PER_REQUEST",
        DeletionProtectionEnabled: true,
        GlobalSecondaryIndexes: Match.arrayWith([
          Match.objectLike({ IndexName: "LeaderboardIndex" }),
          Match.objectLike({ IndexName: "EmailIndex" }),
          Match.objectLike({ IndexName: "UsernameIndex" })
        ])
      })
    });
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "GameState",
      TimeToLiveSpecification: { AttributeName: "expire_at", Enabled: true }
    });
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      TableName: "AccountDeletionCooldown",
      TimeToLiveSpecification: { AttributeName: "available_at", Enabled: true }
    });
  });

  it("keeps the memory and timeout every function runs with today", () => {
    for (const spec of FUNCTION_SPECS) {
      template.hasResourceProperties("AWS::Lambda::Function", {
        FunctionName: spec.functionName,
        MemorySize: spec.memorySize,
        Timeout: spec.timeoutSeconds,
        Runtime: "nodejs24.x",
        Handler: "index.handler"
      });
    }
  });
});

describe("adoption then management", () => {
  it("keeps the logical id of every adopted resource, so the first deploy updates them instead of creating new ones", () => {
    const adopted = Object.keys(resourcesOf(synth(true)));
    const managed = new Set(Object.keys(resourcesOf(synth(false))));
    expect(adopted.filter((id) => !managed.has(id))).toEqual([]);
  });
});
