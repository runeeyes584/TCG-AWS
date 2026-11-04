# Chrono Genesis: hạ tầng (AWS CDK)

Stack `ChronoGenesis` (tài khoản `977233000065`, `ap-southeast-1`): 6 bảng DynamoDB, hàng đợi `Match-Result-queue`,
10 Lambda của game (mỗi Lambda một role riêng) và role Scheduler cho đồng hồ lượt. Kế hoạch và lý do:
`.agents/plan/docs/cdk.md`.

| Muốn | Sửa ở |
| :--- | :--- |
| Đổi memory/timeout, thêm bảng hay quyền cho một Lambda, thêm Lambda mới | `lib/function-specs.ts` |
| Đổi ID tài nguyên có sẵn (API, Cognito, SSM, origin) | `lib/config.ts` |
| Đổi bảng / hàng đợi | `lib/constructs/` |

```bash
npm install          # lần đầu
npm test             # kiểm tra template
npx cdk diff         # xem sẽ thay đổi gì trên AWS
npx cdk deploy       # áp dụng (build lại code Lambda bằng esbuild)
```

Lần đầu (một lần duy nhất, theo thứ tự): `npx cdk bootstrap aws://977233000065/ap-southeast-1`,
`npm run import:map`, `npm run import`, `npx cdk diff`, `npx cdk deploy`.

Không bao giờ đổi `functionName`, `tableName`, `queueName`: API Gateway và Scheduler gọi theo tên.
