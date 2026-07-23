# Leaderboard and global-rank deployment

This implementation uses:

- `UserProfile` as the source of truth.
- `LeaderboardIndex` on `UserProfile` for paginated leaderboard reads.
- `postMatchWorker` for immediate ELO, win/loss, history and GSI-projection updates.
- `rebuildLeaderboardRanks` for exact `rank` assignment every 10 minutes.
- HTTP `GET /leaderboard` and `GET /leaderboard/me` for client reads.
- WebSocket `profile:updated` and `rank:changed` only as refresh signals.

## 1. Build the artifacts

From the repository root:

```powershell
npm run build:lambda:leaderboard
```

Artifacts:

- `Back-end/src/aws-lambdas/dist/httpBackend/index.zip`
- `Back-end/src/aws-lambdas/dist/postMatchWorker/index.zip`
- `Back-end/src/aws-lambdas/dist/rebuildLeaderboardRanks/index.zip`

The handler for all three archives is `index.handler`.

## 2. Add the DynamoDB GSI

On the existing `UserProfile` table, create this global secondary index:

| Setting | Value |
| --- | --- |
| Index name | `LeaderboardIndex` |
| Partition key | `leaderboard_scope` (String) |
| Sort key | `leaderboard_sort` (String) |
| Projection | All attributes |

Console path:

1. DynamoDB → Tables → `UserProfile`.
2. Indexes → Create index.
3. Enter the values above and create it.
4. Wait until index status is `ACTIVE`.

The repository's `npm run db:setup` also creates this index for a new table and
uses `UpdateTable` to add it to an existing table. Run that command only with
the AWS credentials and Region intended for this environment.

GSI creation is asynchronous. Do not enable the HTTP leaderboard in production
until `LeaderboardIndex` is `ACTIVE`. AWS documents the online GSI process and
the relevant CloudWatch progress/throttling metrics here:
https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.OnlineOps.html

## 3. Update the existing Lambdas

### httpBackend

Upload `dist/httpBackend/index.zip`.

Environment:

```text
USER_PROFILE_TABLE=UserProfile
LEADERBOARD_INDEX=LeaderboardIndex
```

Its execution role needs:

```json
{
  "Effect": "Allow",
  "Action": ["dynamodb:GetItem", "dynamodb:Query"],
  "Resource": [
    "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/UserProfile",
    "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/UserProfile/index/LeaderboardIndex"
  ]
}
```

If the HTTP API uses a `$default` or `ANY /{proxy+}` route, Express receives the
new paths automatically. If API Gateway uses explicit routes, add:

```text
GET /leaderboard
GET /leaderboard/me
```

Both routes must target the existing `httpBackend` Lambda integration. Deploy
the API stage after adding explicit routes.

### postMatchWorker

Upload `dist/postMatchWorker/index.zip`.

Keep its existing DynamoDB and SQS configuration, and add:

```text
USER_PROFILE_TABLE=UserProfile
WS_MANAGEMENT_ENDPOINT=https://API_ID.execute-api.REGION.amazonaws.com/STAGE
```

Its role already needs transaction access to `GameState`, `UserProfile` and
`MatchHistory`. Add WebSocket callback permission:

```json
{
  "Effect": "Allow",
  "Action": "execute-api:ManageConnections",
  "Resource": "arn:aws:execute-api:REGION:ACCOUNT_ID:API_ID/STAGE/POST/@connections/*"
}
```

AWS documents `ManageConnections` and the `@connections` ARN format here:
https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-control-access-iam.html

## 4. Create rebuildLeaderboardRanks

1. Lambda → Create function → Author from scratch.
2. Function name: `rebuildLeaderboardRanks`.
3. Select the same Node.js runtime used by the other bundled Lambdas.
4. Architecture: `x86_64` (or rebuild/test consistently before choosing ARM).
5. Upload `dist/rebuildLeaderboardRanks/index.zip`.
6. Runtime settings → Handler: `index.handler`.
7. Memory: start with `512 MB`.
8. Timeout: start with `5 minutes`.
9. Reserved concurrency: `1` to prevent two rebuilds from writing ranks at the
   same time.

Environment:

```text
USER_PROFILE_TABLE=UserProfile
CONNECTIONS_TABLE=Connections
WS_MANAGEMENT_ENDPOINT=https://API_ID.execute-api.REGION.amazonaws.com/STAGE
RANK_REBUILD_CONCURRENCY=10
```

Execution-role policy (in addition to AWSLambdaBasicExecutionRole):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "RebuildRanks",
      "Effect": "Allow",
      "Action": ["dynamodb:Scan", "dynamodb:UpdateItem"],
      "Resource": [
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/UserProfile",
        "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/Connections"
      ]
    },
    {
      "Sid": "NotifyConnectedPlayers",
      "Effect": "Allow",
      "Action": "execute-api:ManageConnections",
      "Resource": "arn:aws:execute-api:REGION:ACCOUNT_ID:API_ID/STAGE/POST/@connections/*"
    }
  ]
}
```

Test it once manually with:

```json
{
  "action": "rebuild-global-ranks",
  "scope": "GLOBAL",
  "reason": "initial-backfill"
}
```

Expected output contains `playersScanned`, `playersUpdated`,
`playersSkipped`, `rankChanges` and `notificationsAttempted`. Confirm several
`UserProfile` items now contain:

```text
rank
rank_updated_at
leaderboard_scope
leaderboard_sort
leaderboard_elo
leaderboard_win_rate
leaderboard_wins
leaderboard_losses
leaderboard_projected_at
```

## 5. Create the 10-minute EventBridge Scheduler

Console:

1. Amazon EventBridge → Scheduler → Create schedule.
2. Name: `rebuild-global-leaderboard-every-10-minutes`.
3. Schedule pattern: Recurring schedule.
4. Rate-based schedule: value `10`, unit `minutes`
   (`rate(10 minutes)`).
5. Flexible time window: Off.
6. Target: AWS Lambda Invoke.
7. Select `rebuildLeaderboardRanks`.
8. Input:

```json
{
  "action": "rebuild-global-ranks",
  "scope": "GLOBAL",
  "reason": "scheduled"
}
```

9. Retry policy: maximum event age `10 minutes`, retry attempts `2`.
10. Optional but recommended: configure an SQS dead-letter queue.
11. Let Scheduler create an execution role, or supply one that trusts
    `scheduler.amazonaws.com` and allows:

```json
{
  "Effect": "Allow",
  "Action": "lambda:InvokeFunction",
  "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:function:rebuildLeaderboardRanks"
}
```

EventBridge Scheduler invokes Lambda asynchronously and supports rate
expressions, retry policies and flexible windows:
https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html

## 6. Deployment order and verification

Recommended order:

1. Create the GSI and wait for `ACTIVE`.
2. Deploy `rebuildLeaderboardRanks`, run the initial backfill, inspect logs.
3. Deploy the updated `postMatchWorker`.
4. Deploy the updated `httpBackend` and API routes if explicit.
5. Push/deploy the frontend through Amplify.
6. Enable the EventBridge schedule.

Verify:

1. `GET /leaderboard?limit=50` returns descending ELO/win-rate entries.
2. `GET /leaderboard/me` returns the signed-in player's fixed rank.
3. Finish a match and verify ELO/history plus leaderboard projection update in
   one post-match transaction.
4. Confirm the client receives `profile:updated`.
5. Run the rebuild test event and confirm the client receives `rank:changed`.
6. Check CloudWatch Logs for `Leaderboard rebuild completed`.

`playersSkipped` can be non-zero when a profile changes during a rebuild. This
is intentional race protection: the job does not overwrite fresher post-match
data, and the next 10-minute run ranks that player.
