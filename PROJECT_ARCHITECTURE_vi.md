# Báo cáo quét kiến trúc dự án

Đây là bản tóm tắt tiếng Việt của báo cáo quét kiến trúc dự án TCG-AWS. Bản phân tích đầy đủ, có sơ đồ và bằng chứng chi tiết nằm trong [Architecture_vi.md](Architecture_vi.md). Khi mã nguồn thay đổi, nên cập nhật tài liệu đầy đủ này trước.

## 1. Tổng quan dự án

Đây là game thẻ bài sưu tầm viết bằng TypeScript, gồm frontend Next.js, game engine dùng chung, xác thực Cognito, lưu trữ DynamoDB, API Gateway HTTP/WebSocket, Lambda, SQS xử lý sau trận và EventBridge Scheduler cho timeout lượt.

## 2. Công nghệ sử dụng

TypeScript và Node.js 24; Next.js 15, React 19, Phaser 4.2.1; Express 5; API Gateway WebSocket và Management API; Socket.IO cho môi trường local; Cognito; DynamoDB; SQS; EventBridge Scheduler; Amplify cho build/hosting frontend; esbuild; Vitest.

## 3. Cấu trúc dự án

`Front-end/` chứa ứng dụng Next.js. `Back-end/src/game/` chứa luật và engine. `Back-end/src/aws-lambdas/` chứa các Lambda production. `Back-end/src/http/`, `auth/`, `user/`, `leaderboard/` và `config/` chứa các dịch vụ backend. `server/` và `matchmaking/` chứa runtime local.

## 4. Tổng quan kiến trúc

Production dùng các Lambda stateless bao quanh aggregate trận đấu lưu trong DynamoDB. Frontend giao tiếp qua REST và WebSocket. Local dùng Socket.IO với state trong bộ nhớ tiến trình. Sơ đồ Mermaid đầy đủ nằm trong `Architecture_vi.md`.

## 5. Trách nhiệm module

Frontend quản lý UI và adapter kết nối; HTTP quản lý REST; auth quản lý Cognito và JWT; Lambda quản lý kết nối, matchmaking, action, timeout, disconnect và kết quả; game engine quản lý chuyển trạng thái; repository quản lý DynamoDB; worker quản lý thống kê và xếp hạng sau trận.

## 6. Entry point và vòng đời

Frontend dùng `next dev`, `next build`, `next start`. HTTP dùng `aws-lambdas/httpBackend.ts` bọc `http/app.ts`. WebSocket dùng `connectHandler.ts`, `startMatch.ts` và các handler action/timeout/end/disconnect. Local dùng `server/index.ts` để khởi động Express và Socket.IO.

## 7. Luồng chính

Đăng ký gọi Cognito và tạo `UserProfile`. Matchmaking tạo hoặc tham gia `GameState` bền vững. Action được xác thực theo connection, xử lý bởi engine, ghi có điều kiện và gửi state đã che giấu thông tin. Trận kết thúc được đưa vào SQS để xử lý hậu kỳ.

## 8. Luồng dữ liệu

Cognito `sub` định danh người dùng. Profile cung cấp danh tính và rating. `GameState` chứa snapshot có thẩm quyền. `GameLogs` lưu audit. SQS truyền tín hiệu hoàn tất trận. `MatchHistory` và `UserProfile` nhận kết quả giao dịch. Projection leaderboard được truy vấn qua GSI.

## 9. Luồng sự kiện

Event nội bộ của game kích hoạt ability và effect đồng bộ. Event từ API Gateway gọi WebSocket Lambda. EventBridge Scheduler gọi xử lý timeout. SQS gọi post-match worker. Chưa thấy sử dụng trực tiếp EventBridge event bus.

## 10. Quản lý state và chuyển trạng thái

Trận đấu chuyển `WAITING -> IN_PROGRESS -> FINISHED`. Phase của engine đi qua action, block, combat và discard/pending-choice. Ghi có điều kiện dùng state version, thời gian lượt và người có priority để ngăn ghi đè state cũ.

## 11. Giao tiếp API và dịch vụ

HTTP cung cấp auth, matches, decks, leaderboard, user và health. WebSocket production có matchmaking, tạo/tham gia phòng, game action, surrender và cancel. Socket.IO local dùng contract khác và được frontend adapter chuyển đổi.

## 12. Database và mô hình dữ liệu

Các bảng là `UserProfile`, `AccountDeletionCooldown`, `GameState`, `GameLogs`, `Connections` và `MatchHistory`. `UserProfile` có `LeaderboardIndex`. Engine hiện tại dùng field camelCase, trong khi `database.types.ts` còn mô hình game cũ dạng snake_case.

## 13. Xác thực và phân quyền

Cognito quản lý vòng đời tài khoản. HTTP nhận access token từ cookie hoặc bearer token. WebSocket xác thực token trước khi lưu connection. Action xác định player từ connection ID và từ chối player ID không khớp hoặc action chỉ dành cho server.

## 14. Tích hợp bên ngoài

Các tích hợp được xác minh gồm Cognito, DynamoDB, API Gateway WebSocket/Management API, SQS, EventBridge Scheduler, tùy chọn Secrets Manager/STS và Amplify frontend build. Chưa có định nghĩa hạ tầng Amplify/IaC backend trong repository.

## 15. Cấu hình và môi trường

Các cấu hình chính gồm region và ID của AWS/Cognito, tên bảng, WebSocket management endpoint, SQS queue URL, ARN của Scheduler role và Lambda đích, CORS, TTL, cùng URL API/WebSocket của frontend. Local đọc dotenv; Lambda dùng environment variables và execution role mặc định.

## 16. Logic nghiệp vụ chính

Engine thực thi luật mana, hand, board, phase, priority, combat, spell, target, graveyard, champion, Nexus, timeout và surrender. Hậu xử lý trận áp dụng ELO, thắng/thua, EXP, level, lịch sử và projection leaderboard.

## 17. Phụ thuộc và liên kết chặt

Các Lambda production phụ thuộc chặt vào tên thuộc tính DynamoDB và event shape của API Gateway. Engine được dùng chung giữa local và serverless. `GameState` lớn liên kết rules, card registry, effect, persistence và transport. HTTP và local server có route trùng lặp.

## 18. Mẫu kiến trúc

Lambda stateless; state machine có server làm authority; event/effect queue đồng bộ; optimistic concurrency; hậu xử lý kiểu outbox qua SQS; leaderboard projection; adapter giữa Socket.IO và API Gateway WebSocket; realtime notification best-effort sau khi ghi bền vững.

## 19. Rủi ro và bất nhất quan trọng

Repository thiếu định nghĩa hạ tầng backend và mapping route/IAM. Transport local và production khác nhau. Matchmaking và rebind dùng scan nên khó mở rộng. Type database bị lệch. Ghi lại toàn bộ GameState gây contention. Token WebSocket trên query string cần che log. Scheduler và cấu hình credential tạo thêm rủi ro vận hành.

## 20. File và entry point chính

Các entry point chính gồm `Front-end/src/hooks/useGameMatch.ts`, `Front-end/src/libs/socket.ts`, `Back-end/src/aws-lambdas/httpBackend.ts`, `connectHandler.ts`, `startMatch.ts`, `processGameEngine.ts`, `handleTimeout.ts`, `postMatchWorker.ts`, `Back-end/src/http/app.ts`, `Back-end/src/game/core/engine.ts`, `Back-end/src/config/dynamodb.ts` và `Back-end/src/server/index.ts`.

## 21. Mô hình tư duy hệ thống

Browser gửi command đã xác thực; Lambda kiểm tra và áp dụng một chuyển đổi của engine; DynamoDB ghi có điều kiện snapshot có thẩm quyền; API Gateway gửi state đã che giấu; Scheduler và SQS tiếp tục xử lý bất đồng bộ. State của browser, log, notification và field trong message SQS chỉ là dữ liệu phụ.

Xem [Architecture_vi.md](Architecture_vi.md) để đọc phân tích đầy đủ, sơ đồ luồng, file liên quan và đánh giá rủi ro.
