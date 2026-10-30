import { Stack, type StackProps } from "aws-cdk-lib";
import type { ITable } from "aws-cdk-lib/aws-dynamodb";
import { PolicyStatement, Role, ServicePrincipal, type IRole } from "aws-cdk-lib/aws-iam";
import type { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import type { IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { EXISTING, functionArn, webSocketManagementEndpoint, type TableKey } from "./config";
import { DataTables } from "./constructs/data-tables";
import { GameFunction } from "./constructs/game-function";
import { MatchResults } from "./constructs/match-results";
import { TurnTimeoutScheduler } from "./constructs/turn-timeout-scheduler";
import { FUNCTION_SPECS, HANDLE_TIMEOUT_FUNCTION_NAME, type FunctionSpec, type TableAccess } from "./function-specs";

/** What a function's permissions are granted on. */
interface SharedResources {
  readonly tables: Readonly<Record<TableKey, ITable>>;
  readonly matchResults: IQueue;
  readonly scheduler: TurnTimeoutScheduler;
}

export interface ChronoStackProps extends StackProps {
  readonly repoRoot: string;
  /**
   * Only for `cdk import`: the template then holds nothing but the existing tables, queue and functions (running
   * with the role they share today), because an import may not create anything else at the same time.
   */
  readonly adopt?: boolean;
  readonly specs?: readonly FunctionSpec[];
}

/** The game backend: its data, its queue and its functions, each function with only the permissions it needs. */
export class ChronoStack extends Stack {
  readonly functions: Readonly<Record<string, NodejsFunction>>;

  constructor(scope: Construct, id: string, props: ChronoStackProps) {
    super(scope, id, props);

    const adopt = props.adopt ?? false;
    const { tables } = new DataTables(this, "Data", { deletionProtection: !adopt });
    const { queue: matchResults } = new MatchResults(this, "MatchResults");
    const scheduler = adopt ? undefined : new TurnTimeoutScheduler(this, "TurnTimeouts");
    const sharedRole: IRole | undefined = adopt
      ? Role.fromRoleArn(this, "SharedExecutionRole", EXISTING.sharedExecutionRoleArn, { mutable: false })
      : undefined;

    const environmentOf = (spec: FunctionSpec): Record<string, string> => ({
      ...(spec.pushesToWebSocket ? { WS_MANAGEMENT_ENDPOINT: webSocketManagementEndpoint } : {}),
      ...(spec.sendsMatchResults ? { SQS_MATCH_RESULTS_QUEUE_URL: matchResults.queueUrl } : {}),
      ...(spec.turnTimeouts === "manage"
        ? {
          HANDLE_TIMEOUT_LAMBDA_ARN: functionArn(HANDLE_TIMEOUT_FUNCTION_NAME),
          TURN_TIMEOUT_SCHEDULER_ROLE_ARN: scheduler?.role.roleArn ?? EXISTING.sharedExecutionRoleArn
        }
        : {}),
      ...(spec.cognito
        ? {
          COGNITO_REGION: EXISTING.cognito.region,
          COGNITO_USER_POOL_ID: EXISTING.cognito.userPoolId,
          COGNITO_CLIENT_ID: EXISTING.cognito.clientId
        }
        : {}),
      ...(spec.cognito === "client" ? { COGNITO_CLIENT_SECRET_PARAM: EXISTING.cognito.clientSecretParameter } : {}),
      ...(spec.frontendOrigins ? { FRONTEND_ORIGINS: EXISTING.frontendOrigins.join(",") } : {})
    });

    const shared: SharedResources | undefined = scheduler ? { tables, matchResults, scheduler } : undefined;
    const functions: Record<string, NodejsFunction> = {};
    // An import may only take over what exists, so the adoption template leaves out the functions this stack creates.
    const specs = (props.specs ?? FUNCTION_SPECS).filter((spec) => !(adopt && spec.createdByStack));
    for (const spec of specs) {
      const fn = new GameFunction(this, spec.id, {
        spec,
        repoRoot: props.repoRoot,
        environment: environmentOf(spec),
        role: sharedRole
      }).function;
      functions[spec.id] = fn;
      // While adopting, the functions keep the shared role, which this stack does not change.
      if (shared) this.grantAccess(fn, spec, shared);
    }
    this.functions = functions;
  }

  /** The permissions behind every capability the spec declares, and nothing more. */
  private grantAccess(fn: NodejsFunction, spec: FunctionSpec, { tables, matchResults, scheduler }: SharedResources): void {
    for (const [key, access] of Object.entries(spec.tables) as Array<[TableKey, TableAccess]>) {
      if (access === "readWrite") tables[key].grantReadWriteData(fn);
      else tables[key].grantReadData(fn);
    }
    if (spec.sendsMatchResults) matchResults.grantSendMessages(fn);
    if (spec.consumesMatchResults) matchResults.grantConsumeMessages(fn);
    if (spec.turnTimeouts === "manage") scheduler.grantScheduling(fn);
    if (spec.turnTimeouts === "cancel") scheduler.grantCancelling(fn);
    const { apiId, stage } = EXISTING.webSocket;
    if (spec.pushesToWebSocket) {
      fn.addToRolePolicy(new PolicyStatement({
        actions: ["execute-api:ManageConnections"],
        resources: [`arn:aws:execute-api:${this.region}:${this.account}:${apiId}/${stage}/*/@connections/*`]
      }));
    }
    for (const route of spec.webSocketRoutes ?? []) {
      fn.addPermission(`WebSocketRoute-${route}`, {
        principal: new ServicePrincipal("apigateway.amazonaws.com"),
        sourceArn: `arn:aws:execute-api:${this.region}:${this.account}:${apiId}/${stage}/${route}`
      });
    }
    if (spec.cognito === "client") {
      fn.addToRolePolicy(new PolicyStatement({
        actions: ["ssm:GetParameter"],
        resources: [`arn:aws:ssm:${this.region}:${this.account}:parameter${EXISTING.cognito.clientSecretParameter}`]
      }));
    }
  }
}
