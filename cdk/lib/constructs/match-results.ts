import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Queue, QueueEncryption, type IQueue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { MATCH_RESULTS_QUEUE_NAME } from "../config";

/**
 * The queue of finished matches that the ELO worker (`PostMatchWorker-function`) consumes, with the settings it
 * has today. Retained: it may hold results not yet processed.
 */
export class MatchResults extends Construct {
  readonly queue: IQueue;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.queue = new Queue(this, "Queue", {
      queueName: MATCH_RESULTS_QUEUE_NAME,
      retentionPeriod: Duration.days(4),
      // Must stay at least the worker's timeout, or a message is handed out again while it is being processed.
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(20),
      encryption: QueueEncryption.SQS_MANAGED,
      removalPolicy: RemovalPolicy.RETAIN
    });
  }
}
