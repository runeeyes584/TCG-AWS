import { Stack } from "aws-cdk-lib";
import { Effect, PolicyStatement, Role, ServicePrincipal, type IGrantable, type IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { EXISTING, functionArn } from "../config";
import { HANDLE_TIMEOUT_FUNCTION_NAME } from "../function-specs";

/**
 * The safety net of the turn clock: the backend points one EventBridge Scheduler schedule per match
 * (`turn-<matchId>`) at the deadline of the running turn, and the schedule invokes `HandleTimeout-function` with this
 * role. The role may invoke that one function and nothing else.
 */
export class TurnTimeoutScheduler extends Construct {
  readonly role: IRole;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    const target = functionArn(HANDLE_TIMEOUT_FUNCTION_NAME);
    this.role = new Role(this, "InvokeRole", {
      assumedBy: new ServicePrincipal("scheduler.amazonaws.com", {
        conditions: { StringEquals: { "aws:SourceAccount": Stack.of(this).account } }
      }),
      description: "Lets the per-match turn-timeout schedules invoke HandleTimeout-function."
    });
    this.role.addToPrincipalPolicy(new PolicyStatement({
      actions: ["lambda:InvokeFunction"],
      resources: [target, `${target}:*`]
    }));
  }

  /** Lets a function create, move and delete the turn-timeout schedules, and hand this role to them. */
  grantScheduling(grantee: IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(new PolicyStatement({
      actions: ["scheduler:CreateSchedule", "scheduler:UpdateSchedule", "scheduler:DeleteSchedule", "scheduler:GetSchedule"],
      resources: [this.schedulesArn()]
    }));
    grantee.grantPrincipal.addToPrincipalPolicy(new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["iam:PassRole"],
      resources: [this.role.roleArn],
      conditions: { StringEquals: { "iam:PassedToService": "scheduler.amazonaws.com" } }
    }));
  }

  /** Lets a function delete a turn-timeout schedule, and nothing else. */
  grantCancelling(grantee: IGrantable): void {
    grantee.grantPrincipal.addToPrincipalPolicy(new PolicyStatement({
      actions: ["scheduler:DeleteSchedule"],
      resources: [this.schedulesArn()]
    }));
  }

  private schedulesArn(): string {
    const { account, region } = Stack.of(this);
    return `arn:aws:scheduler:${region}:${account}:schedule/${EXISTING.turnTimeoutScheduleGroup}/turn-*`;
  }
}
