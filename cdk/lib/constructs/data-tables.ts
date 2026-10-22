import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, ProjectionType, Table, type ITable, type TableProps } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";
import { TABLE_NAMES, type TableKey } from "../config";

export interface DataTablesProps {
  /** Turned on once the tables are owned by the stack; left off while adopting them, to match what exists. */
  readonly deletionProtection: boolean;
}

/**
 * The six game tables, exactly as they exist (keys, indexes, TTL, on-demand billing). They hold player data, so
 * they are always retained: removing them from the stack, or deleting the stack, never deletes a table.
 */
export class DataTables extends Construct {
  readonly tables: Readonly<Record<TableKey, ITable>>;

  constructor(scope: Construct, id: string, props: DataTablesProps) {
    super(scope, id);

    const table = (constructId: string, definition: Omit<TableProps, "billingMode" | "removalPolicy" | "deletionProtection">) =>
      new Table(this, constructId, {
        ...definition,
        billingMode: BillingMode.PAY_PER_REQUEST,
        removalPolicy: RemovalPolicy.RETAIN,
        deletionProtection: props.deletionProtection
      });

    const userProfile = table("UserProfile", {
      tableName: TABLE_NAMES.userProfile,
      partitionKey: { name: "user_id", type: AttributeType.STRING }
    });
    userProfile.addGlobalSecondaryIndex({
      indexName: "LeaderboardIndex",
      partitionKey: { name: "leaderboard_scope", type: AttributeType.STRING },
      sortKey: { name: "leaderboard_sort", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });
    userProfile.addGlobalSecondaryIndex({
      indexName: "EmailIndex",
      partitionKey: { name: "email_lower", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });
    userProfile.addGlobalSecondaryIndex({
      indexName: "UsernameIndex",
      partitionKey: { name: "username_lower", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL
    });

    this.tables = {
      userProfile,
      gameState: table("GameState", {
        tableName: TABLE_NAMES.gameState,
        partitionKey: { name: "match_id", type: AttributeType.STRING },
        timeToLiveAttribute: "expire_at"
      }),
      gameLogs: table("GameLogs", {
        tableName: TABLE_NAMES.gameLogs,
        partitionKey: { name: "match_id", type: AttributeType.STRING },
        sortKey: { name: "action_sequence", type: AttributeType.NUMBER }
      }),
      connections: table("Connections", {
        tableName: TABLE_NAMES.connections,
        partitionKey: { name: "connection_id", type: AttributeType.STRING }
      }),
      matchHistory: table("MatchHistory", {
        tableName: TABLE_NAMES.matchHistory,
        partitionKey: { name: "user_id", type: AttributeType.STRING },
        sortKey: { name: "played_at", type: AttributeType.NUMBER }
      }),
      accountDeletionCooldown: table("AccountDeletionCooldown", {
        tableName: TABLE_NAMES.accountDeletionCooldown,
        partitionKey: { name: "email", type: AttributeType.STRING },
        timeToLiveAttribute: "available_at"
      })
    };
  }
}
