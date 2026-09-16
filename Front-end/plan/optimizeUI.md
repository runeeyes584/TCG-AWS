# Kế hoạch tối ưu trải nghiệm khởi tạo UI

## Trạng thái

- Phạm vi: chỉ tối ưu luồng khởi tạo giao diện của `/play`, `/room-create` và `/room-join`.
- Mục tiêu: loại bỏ hiện tượng giật/cục bộ khi vừa truy cập production, nhưng vẫn giữ phong cách cyber/fantasy, splash art, animation và toàn bộ logic game.
- Trạng thái triển khai: đã áp dụng nhóm fix an toàn P1/P2/P3; production build đã pass; cần đo lại trực tiếp trên môi trường Amplify thật.
- Không thay đổi: game engine, luật chơi, WebSocket protocol, matchmaking, create room, join room, reconnect và Lambda/API Gateway flow.

## 1. Kết quả scan và nguyên nhân gốc

### 1.1. Luồng đang xảy ra khi mở route

Khi người dùng mở một route được bảo vệ:

1. `AuthGuard` mount trong trạng thái `loading`.
2. `AuthGuard` khởi tạo `PhaserSplash` để làm loading background.
3. `AuthGuard` gọi `/auth/me`.
4. Khi xác thực xong, loading component bị unmount.
5. Page chính mount lại một `PhaserSplash` khác.
6. Đồng thời page khởi tạo WebSocket, kiểm tra pending match, profile/deck và animation.

Việc tạo hai lifecycle Phaser theo race condition không xảy ra ở mọi lần tải, nhưng khi xảy ra sẽ gây decode/upload texture và khởi tạo render loop trùng thời điểm.

### 1.2. Asset và chi phí runtime

`PhaserSplash` trước đây preload toàn bộ 8 ảnh hero trong `preload()`. Artifact production đã kiểm tra có tổng dung lượng khoảng 25.673.157 bytes, tương đương 24,48 MiB. Nhiều ảnh đơn lẻ có dung lượng 4–6 MiB.

Ngoài network transfer, browser còn phải:

- decode PNG/JPEG;
- tạo texture;
- upload texture lên GPU;
- composite canvas với gradient, blur và shadow;
- chạy tween/particle/render loop.

Phaser được import động nhưng chunk Phaser vẫn khoảng 1,37 MB. Vì vậy chỉ số First Load JS khoảng 234–240 kB của các route không phản ánh toàn bộ chi phí thực tế lúc splash khởi động.

`/play` còn tạo audio với `preload="auto"` cho file MP3 khoảng 5,3 MB, khiến media loading chạy cùng thời điểm first render.

### 1.3. Chi phí phụ do request và state

Các request/API chính:

- `AuthGuard`: `/auth/me`.
- `/play`: WebSocket, pending match, profile và audio.
- `/room-create`/`/room-join`: WebSocket, pending match, decks và profile.

`PrivateRoomScreen` trước đây dùng effect phụ thuộc vào `profile`, khiến việc load deck có thể chạy lại sau khi profile được cập nhật. `AuthGuard` cũng chưa ghi profile vừa xác thực vào cache, nên page con có thể gọi `/auth/me` thêm lần nữa.

Đây là yếu tố phụ, không phải nguyên nhân chính của frame drop, nhưng làm tăng burst request và số lần render trong thời điểm nhạy cảm.

### 1.4. Kết luận root cause

Nguyên nhân cốt lõi là critical rendering path bị quá tải bởi frontend visual initialization:

```text
Auth loading Phaser
  + route Phaser
  + 24.48 MiB splash texture
  + Phaser/WebGL render loop
  + audio preload trên /play
  + React hydration/Framer Motion
  + API/WebSocket state updates
        => decode/composite/main-thread/GPU contention
        => giao diện xuất hiện giật và không liền mạch
```

Amplify, API Gateway và Lambda làm hiện tượng dễ thấy hơn do CDN transfer, cold start và độ trễ kết nối, nhưng không phải điểm cần thay đổi đầu tiên. Không được tăng Lambda memory hoặc sửa gameplay trước khi loại bỏ frontend bottleneck này.

## 2. Nguyên tắc triển khai

- Giữ hiệu ứng đẹp sau khi first paint; không loại bỏ toàn bộ visual system.
- Không tải animation nặng trong auth loading.
- Không để texture và audio lớn chặn khả năng tương tác ban đầu.
- Mỗi route chỉ tạo tối đa một splash runtime.
- Không thay đổi state machine của game hoặc protocol WebSocket.
- Mọi effect phải cleanup timer, idle callback, listener và Phaser instance khi unmount.
- Tối ưu riêng các route bị ảnh hưởng, tránh refactor lan sang game board và các flow ổn định.

## 3. Kế hoạch thực hiện

### P0 — Profiling và baseline

Đo trên production build, cả cache lạnh và cache nóng:

- Chrome Performance: Long Task, scripting, rendering, painting và FPS.
- Network: Phaser chunk, hero texture, audio, `/auth/me`, pending match, deck và WebSocket.
- Desktop, mobile, Slow 4G và thiết bị có `prefers-reduced-motion`.
- `/play`, `/room-create`, `/room-join`; riêng `/room-join` đo cả trường hợp có và không có room code.

Các dấu hiệu phải kiểm tra:

- số lượng canvas Phaser sau khi route ổn định;
- có request texture bị lặp không;
- first paint có xảy ra trước khi splash hoàn tất không;
- có `/auth/me` hoặc refresh token trùng không;
- thời điểm WebSocket connect so với thời điểm UI có thể thao tác.

### P1 — Loại bỏ bottleneck trong critical path

1. Dùng auth loading thuần CSS cho ba route mục tiêu. `AuthGuard` vẫn giữ animated backdrop mặc định cho các route khác để không thay đổi hành vi ngoài phạm vi.
2. Ghi profile đã xác thực vào cache để page con tái sử dụng dữ liệu hiện có.
3. Trì hoãn import/khởi tạo Phaser bằng `requestIdleCallback`, có timeout dự phòng.
4. Bỏ preload toàn bộ splash image; chỉ tải hero đầu tiên, các hero tiếp theo được tải từng ảnh khi đến thời điểm chuyển cảnh.
5. Không khởi tạo Phaser khi người dùng bật `prefers-reduced-motion` hoặc `Save-Data`.
6. Giảm decorative render target từ 45 FPS xuống 30 FPS; đây là background, không phải gameplay, nên vẫn giữ chuyển động nhưng giảm CPU/GPU cost.
7. Đặt audio preload về `none`, chỉ bắt đầu tải sau user gesture.

### P2 — Giảm compositing cost nhưng giữ thẩm mỹ

- Bỏ `transform: translateZ(0)` và `will-change` cố định khỏi private-room module.
- Giảm blur panel private room từ 18px xuống 14px.
- Trên mobile hoặc `prefers-reduced-motion`, thay blur bằng nền rgba đặc hơn để giữ chiều sâu màu nhưng tránh repaint toàn vùng.
- Giữ gradient, glow, grid, border, typography, motion intro và Phaser splash sau idle.

### P3 — Giảm request/state trùng

- Bỏ lần gọi profile lặp trong `/play`; profile lấy từ cache được AuthGuard hydrate.
- Tách effect load deck và profile trong `PrivateRoomScreen`.
- Load deck cloud một lần trong lifecycle screen.
- Vẫn giữ pending match check và WebSocket initialization vì đây là nghiệp vụ cần thiết.
- Chưa thay đổi reconnect/backoff hoặc server timeout vì không liên quan trực tiếp tới first-render jank.

### P4 — Tối ưu asset tiếp theo

Đã triển khai trong đợt fix này:

- tạo derivative WebP riêng cho splash;
- resize splash artwork tối đa 1400px theo cạnh dài;
- giữ initial hero khoảng 178 KB và tổng bộ splash khoảng 2,4 MB thay vì 24,48 MiB;
- chỉ dùng derivative trong `PhaserSplash`, không thay asset gameplay;
- giữ asset độ phân giải cao nếu đang được game board sử dụng ở flow khác.

Không thay thế asset gốc của gameplay nếu chưa kiểm tra visual regression.

## 4. Walkthrough triển khai

### 4.1. `AuthGuard`

Đã thêm prop `animatedBackdrop`, mặc định `true` để bảo toàn hành vi hiện có. `/play`, `/room-create` và `/room-join` truyền `animatedBackdrop={false}`.

Khi tắt animated backdrop:

- auth loading dùng `AuthGateLoadingState` thuần CSS;
- unauthenticated state cũng dùng static shell;
- không tạo Phaser canvas trong thời gian chờ auth;
- vẫn giữ nguyên redirect, thông báo và button đăng nhập.

Khi xác thực thành công, profile được ghi vào `profileCache`. Điều này cho phép page con dùng dữ liệu cache ngay khi mount.

### 4.2. `PhaserSplash`

Đã thay đổi lifecycle theo hướng progressive enhancement:

- import Phaser sau idle hoặc tối đa sau timeout 1,2 giây;
- cleanup idle callback/timeout khi unmount;
- skip runtime khi `prefers-reduced-motion` hoặc `Save-Data`;
- preload duy nhất hero đầu tiên nhẹ hơn;
- tải hero tiếp theo on-demand khi timer chuyển cảnh;
- giữ nguyên circuit, particle, glow, fade, breathing animation và resize handling;
- giảm background target xuống 30 FPS.

Các thay đổi này không ảnh hưởng tới game board Phaser vì chỉ áp dụng `PhaserSplash`.

### 4.3. `useLoopingAudio`

Đã chuyển `audio.preload` từ `auto` sang `none` và bỏ lệnh play ngay khi effect mount. Audio vẫn phát khi có pointer/keyboard gesture hoặc khi người dùng tương tác với control âm thanh, nhưng không còn cạnh tranh với first render.

Behavior mute/unmute và việc dừng audio khi vào match vẫn được giữ nguyên.

### 4.4. `PrivateRoomScreen`

Đã tách:

- effect load cloud decks: chạy một lần;
- effect fallback load profile: chỉ chạy khi không có profile cache.

Điều này ngăn việc profile update làm chạy lại `listDecks()`.

### 4.5. CSS

Đã loại bỏ các GPU layer cố định không cần thiết khỏi private room module, giảm blur host panel và thêm fallback mobile/reduced-motion. Các màu sắc, border, glow và layout chính vẫn giữ nguyên.

## 5. Phạm vi không thay đổi

Các phần sau không bị sửa logic:

- `useGameMatch` state machine;
- ApiGatewaySocket và Socket.IO fallback;
- room create/join payload;
- matchmaking start/cancel;
- pending match recovery;
- GameBoard/GameEngine;
- Lambda, DynamoDB, EventBridge Scheduler;
- countdown, AFK và timeout processing.

## 6. Kiểm thử và tiêu chí nghiệm thu

### Static/build checks

- `npm run build` phải pass.
- TypeScript phải pass.
- Không có import chết hoặc lỗi lint mới.
- Worktree chỉ chứa thay đổi thuộc kế hoạch; các thay đổi có sẵn của người dùng phải được giữ nguyên.

### Runtime checks

- auth loading không tạo canvas Phaser;
- mỗi route ổn định chỉ có tối đa một splash canvas;
- first paint không phụ thuộc vào toàn bộ hero texture hoặc audio;
- texture còn lại tải tuần tự sau khi giao diện đã hiển thị;
- API/WebSocket chậm không làm UI block;
- create room vẫn tự tạo room sau khi socket `Connected`;
- join room tự join khi room code hợp lệ;
- pending match, recovery, cancel và leave room vẫn hoạt động.

### Visual checks

- splash vẫn có grid, circuit, glow, hero fade và particle;
- private room vẫn giữ cyber terminal, code slot, radar và transition;
- `/play` vẫn giữ matchmaking console, search overlay và match showcase;
- mobile không bị tràn layout;
- reduced-motion không chạy animation Phaser nặng.

### Production profiling sau triển khai

Đo lại trên Amplify với cache lạnh và Slow 4G. Kết quả cần xác nhận:

- không còn burst tải 24,48 MiB texture ngay khi route mở;
- audio không xuất hiện trong critical network waterfall trước interaction;
- Long Task đầu route giảm rõ rệt so với baseline;
- FPS ổn định hơn trong 2 giây đầu;
- thời gian người dùng có thể tương tác không phụ thuộc vào Phaser.

## 7. Rollback an toàn

Nếu phát hiện visual regression:

1. Giữ nguyên auth static fallback và audio lazy-load vì đây là thay đổi độc lập, ít rủi ro.
2. Có thể khôi phục thứ tự/hero splash trong `PhaserSplash` mà không chạm gameplay.
3. Có thể điều chỉnh lại target FPS hoặc blur theo profiling thiết bị.
4. Không rollback bằng cách đưa toàn bộ Phaser và asset preload trở lại critical path.

## 8. Trạng thái sau triển khai

Đã triển khai code các mục P1, P2, P3 và phần asset an toàn của P4 nêu trên.

Kết quả kiểm tra hiện tại:

- `npm run build`: pass, Next.js hoàn tất compile, type check và static page generation.
- `npx vitest run Front-end/src/libs/socket.test.ts`: 4/4 test pass.
- Full Vitest: 176/212 test pass. 36 test fail ở backend hiện hữu, không liên quan tới thay đổi UI: fixture card thiếu (`sparksmith`/Cat cards), một số test deck authoritative lệch baseline và các test tích hợp AWS bị sandbox chặn kết nối `EACCES`.
- `git diff --check`: không phát hiện whitespace error trong diff.
- Browser smoke test local chưa thực hiện được vì môi trường hiện tại không có browser session khả dụng; cần kiểm tra lại sau khi deploy Amplify.

Bước còn lại là đo lại trực tiếp trên Amplify production. Nếu profiling vẫn cho thấy texture decode là bottleneck trên thiết bị yếu, tiếp tục giảm chất lượng/resolution của riêng derivative splash, không thay đổi flow nghiệp vụ hoặc asset gameplay.
