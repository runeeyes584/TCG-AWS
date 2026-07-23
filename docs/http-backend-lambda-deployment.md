# Triển khai HTTP backend Express bằng một AWS Lambda

## Kiến trúc

- Amplify Hosting chỉ chạy frontend Next.js.
- Một HTTP API Gateway chuyển toàn bộ route qua `$default` đến Lambda `chrono-http-backend`.
- Lambda chạy Express và cung cấp `/health`, toàn bộ `/auth/*`, `/matches/pending` và `/matches/pending/forfeit`.
- API Gateway WebSocket hiện tại tiếp tục dùng các Lambda WebSocket riêng. HTTP Lambda chỉ gọi Management API khi cần thông báo kết thúc trận.
- Cognito quản lý tài khoản/token; DynamoDB lưu hồ sơ và trạng thái game. Cognito không thay thế các HTTP endpoint ứng dụng.

## 1. Tạo gói triển khai

Tại thư mục gốc repository:

```powershell
npm ci
npm run build:lambda:http
```

Upload file:

`Back-end/src/aws-lambdas/dist/httpBackend/index.zip`

ZIP đã bundle toàn bộ dependency cần thiết và có handler `index.handler`.

## 2. Kiểm tra DynamoDB

Trong region `ap-southeast-1`, phải có các bảng:

| Bảng | Partition key | Sort key |
|---|---|---|
| `UserProfile` | `user_id` (String) | — |
| `GameState` | `match_id` (String) | — |
| `GameLogs` | `match_id` (String) | `action_sequence` (Number) |
| `Connections` | `connection_id` (String) | — |
| `MatchHistory` | `user_id` (String) | `played_at` (Number) |

Nên dùng On-demand (`PAY_PER_REQUEST`). Bật TTL của `GameState` với thuộc tính `expire_at`.

## 3. Tạo Lambda

1. AWS Console → Lambda → **Create function** → **Author from scratch**.
2. Function name: `chrono-http-backend`.
3. Runtime: **Node.js 24.x**.
4. Architecture: `x86_64`.
5. Permissions: chọn **Create a new role with basic Lambda permissions**.
6. Create function.
7. Tab **Code** → **Upload from** → `.zip file` → chọn `index.zip` → Save.
8. **Runtime settings** → Edit → Handler: `index.handler`.
9. **Configuration → General configuration**:
   - Memory: `512 MB`
   - Timeout: `30 sec`
10. Không gắn Lambda vào VPC, trừ khi đã có NAT Gateway/VPC endpoints cho Cognito, DynamoDB, SQS và API Gateway. Cấu hình VPC thiếu đường ra sẽ làm auth bị timeout.

## 4. Environment variables của Lambda

Lambda → Configuration → Environment variables → Edit:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `COGNITO_REGION` | `ap-southeast-1` |
| `COGNITO_USER_POOL_ID` | ID User Pool thật, ví dụ `ap-southeast-1_XXXXXXX` |
| `COGNITO_CLIENT_ID` | App client ID thật |
| `COGNITO_CLIENT_SECRET` | Secret của app client; bỏ biến này nếu app client không có secret |
| `FRONTEND_ORIGINS` | URL Amplify thật, không có `/` cuối; nhiều domain ngăn cách bằng dấu phẩy |
| `DB_REGION` | `ap-southeast-1` |
| `USER_PROFILE_TABLE` | `UserProfile` |
| `GAME_STATE_TABLE` | `GameState` |
| `GAME_LOGS_TABLE` | `GameLogs` |
| `CONNECTIONS_TABLE` | `Connections` |
| `WS_MANAGEMENT_ENDPOINT` | `https://ykgumu549b.execute-api.ap-southeast-1.amazonaws.com/dev` |
| `SQS_MATCH_RESULTS_QUEUE_URL` | Queue URL thật của post-match worker; bỏ nếu chưa dùng worker |

`WS_MANAGEMENT_ENDPOINT` bắt buộc dùng `https://`, trong khi frontend dùng `NEXT_PUBLIC_WS_URL` với `wss://`.

## 5. Cấp quyền IAM cho Lambda

Mở Lambda → Configuration → Permissions → bấm execution role. Giữ managed policy `AWSLambdaBasicExecutionRole`, rồi thêm inline policy dưới đây. Thay `ACCOUNT_ID` và `SQS_QUEUE_NAME` bằng giá trị thật. Nếu chưa dùng SQS, xóa statement `SqsPostMatch`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DynamoGameData",
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-1:ACCOUNT_ID:table/UserProfile",
        "arn:aws:dynamodb:ap-southeast-1:ACCOUNT_ID:table/GameState",
        "arn:aws:dynamodb:ap-southeast-1:ACCOUNT_ID:table/GameLogs",
        "arn:aws:dynamodb:ap-southeast-1:ACCOUNT_ID:table/Connections"
      ]
    },
    {
      "Sid": "NotifyWebSocketClients",
      "Effect": "Allow",
      "Action": "execute-api:ManageConnections",
      "Resource": "arn:aws:execute-api:ap-southeast-1:ACCOUNT_ID:ykgumu549b/dev/POST/@connections/*"
    },
    {
      "Sid": "SqsPostMatch",
      "Effect": "Allow",
      "Action": "sqs:SendMessage",
      "Resource": "arn:aws:sqs:ap-southeast-1:ACCOUNT_ID:SQS_QUEUE_NAME"
    }
  ]
}
```

Không thêm access key tĩnh vào Lambda. AWS SDK tự dùng execution role.

## 6. Tạo API Gateway HTTP API

1. API Gateway → **Create API**.
2. Chọn **HTTP API** (không chọn REST API, không sửa WebSocket API hiện có) → Build.
3. Add integration → Lambda → region `ap-southeast-1` → `chrono-http-backend`.
4. API name: `chrono-http-api`.
5. Route: tạo route key **`$default`** và trỏ đến Lambda trên.
6. Integration payload format version: **2.0**.
7. Stage: dùng **`$default`**, bật **Auto-deploy**.
8. Không gắn JWT authorizer vào `$default`: các route đăng ký/login phải public; middleware Express đã kiểm tra Bearer token cho route riêng tư.

### CORS

API Gateway → HTTP API → CORS:

- Allow origins: URL Amplify thật, ví dụ `https://dev.xxxxx.amplifyapp.com`; không dùng `*` khi Allow credentials bật.
- Allow methods: `GET`, `POST`, `OPTIONS`.
- Allow headers: `authorization`, `content-type`.
- Allow credentials: `Yes`.
- Max age: `3600`.

Lưu lại và chép **Invoke URL**, ví dụ:

`https://abc123.execute-api.ap-southeast-1.amazonaws.com`

Nếu dùng stage tên `dev` thay cho `$default`, URL sẽ có `/dev`. Không tự thêm một stage không tồn tại.

## 7. Kết nối Amplify với HTTP API

Amplify → app → Hosting → Environment variables:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Invoke URL của HTTP API, không có `/` cuối |
| `NEXT_PUBLIC_WS_URL` | `wss://ykgumu549b.execute-api.ap-southeast-1.amazonaws.com/dev` |
| `NEXT_PUBLIC_MATCHMAKING_ROUTE` | `matchfinding-start` |

Sau khi đổi `NEXT_PUBLIC_*`, phải **Redeploy this version** hoặc push commit mới vì các giá trị này được nhúng lúc Next.js build.

Repository này là monorepo vì frontend nằm trong `Front-end`, nhưng không dùng Amplify Gen2 backend:

- **My app is a monorepo:** bật, app root `Front-end`.
- **My monorepo uses Amplify Gen2 Backend:** không bật.
- **Enable SSR app logs:** không cần cho các route hiện đều được prerender static; log HTTP backend nằm tại `/aws/lambda/chrono-http-backend`.

## 8. Kiểm tra sau deploy

Thay `HTTP_API_URL` bằng Invoke URL thật:

```powershell
Invoke-RestMethod -Method Get -Uri "HTTP_API_URL/health"
```

Kết quả mong đợi:

```json
{"success":true,"service":"chrono-http-backend"}
```

Sau đó kiểm tra theo thứ tự:

1. Đăng ký → nhận email Cognito.
2. Xác nhận mã → đăng nhập.
3. Kiểm tra DynamoDB `UserProfile` có item với `user_id` bằng Cognito `sub`.
4. Mở hai tài khoản/trình duyệt, chạy matchmaking qua WebSocket.
5. Reload trang khi đang chờ/đang đấu: `/matches/pending` phải trả lại `roomCode` từ DynamoDB.
6. Forfeit: `GameState.status` thành `FINISHED`, có `GameLogs`, hai client nhận `match:ended`.
7. Nếu bật SQS, kiểm tra worker cập nhật `UserProfile` và `MatchHistory`.

Nếu lỗi, xem CloudWatch Logs → log group `/aws/lambda/chrono-http-backend`. Các lỗi thường gặp:

- `Missing required environment variable`: thiếu Cognito env.
- `NotAuthorizedException`/`SecretHash`: app client secret không khớp.
- `AccessDeniedException`: thiếu IAM DynamoDB/SQS/ManageConnections.
- `GoneException`: WebSocket connection cũ đã đóng; không phải lỗi HTTP API.
- CORS: origin trong API Gateway và `FRONTEND_ORIGINS` chưa đúng chính xác.
