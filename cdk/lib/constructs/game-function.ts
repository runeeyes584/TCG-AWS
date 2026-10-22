import path from "node:path";
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import type { IRole } from "aws-cdk-lib/aws-iam";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import type { FunctionSpec } from "../function-specs";

export interface GameFunctionProps {
  readonly spec: FunctionSpec;
  /** Root of the repository: where `Back-end/` and the lockfile are. */
  readonly repoRoot: string;
  readonly environment: Record<string, string>;
  /** An existing role to run with (only while adopting); otherwise the function gets a role of its own. */
  readonly role?: IRole;
}

/**
 * One backend Lambda function, built from its TypeScript handler the same way `scripts/build-lambda.mjs` builds
 * it (esbuild, CommonJS, minified, the AWS SDK left to the runtime). Retained, so that taking it out of the stack
 * never deletes a function the game is calling.
 */
export class GameFunction extends Construct {
  readonly function: NodejsFunction;

  constructor(scope: Construct, id: string, props: GameFunctionProps) {
    super(scope, id);

    const { spec, repoRoot } = props;
    this.function = new NodejsFunction(this, "Function", {
      functionName: spec.functionName,
      entry: path.join(repoRoot, "Back-end", "src", "aws-lambdas", spec.entry),
      handler: "handler",
      runtime: Runtime.NODEJS_24_X,
      architecture: Architecture.X86_64,
      memorySize: spec.memorySize,
      timeout: Duration.seconds(spec.timeoutSeconds),
      environment: props.environment,
      role: props.role,
      projectRoot: repoRoot,
      depsLockFilePath: path.join(repoRoot, "package-lock.json"),
      bundling: {
        format: OutputFormat.CJS,
        target: "node24",
        minify: true,
        sourceMap: false,
        externalModules: ["@aws-sdk/*"]
      }
    });
    this.function.applyRemovalPolicy(RemovalPolicy.RETAIN);
  }
}
