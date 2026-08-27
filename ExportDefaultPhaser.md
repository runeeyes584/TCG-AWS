# Walkthrough: Khắc phục Triệt để Lỗi "Export default doesn't exist in target module" & Lỗi setState in Render (MatchFoundShowcase)

Tài liệu này ghi lại chi tiết nguyên nhân cốt lõi, quá trình điều tra, các bước sửa lỗi và kết quả xác minh cho hai sự cố:
1. **Lỗi Phaser ESM & Next.js Turbopack**: `Export default doesn't exist in target module`.
2. **Lỗi React 19 State Lifecycle**: `Cannot update a component (OnlinePlayPageContent) while rendering a different component (MatchFoundShowcase)`.

---

## 1. Sự cố 1: Lỗi "Export default doesn't exist in target module" (Phaser ESM / Next.js)

### 1.1. Nguyên Nhân Cốt Lõi
1. **Cơ chế Module của Phaser ESM**: Package `phaser` (phiên bản `3.90.0` / `^4.2.1`) trỏ `"module": "./dist/phaser.esm.js"`. Trong file `phaser.esm.js`, toàn bộ API được xuất bản dưới dạng **Named Exports** (`export { Game, Scene, GameObjects, BlendModes, Math, ... }`), hoàn toàn **KHÔNG có `export default Phaser`**.
2. **Sai lệch cú pháp Import trong Codebase**:
   - Các file chỉ sử dụng Phaser cho type annotations nhưng lại dùng cú pháp `import Phaser from "phaser";` (import default value) thay vì `import type Phaser from "phaser";`.
   - Các file dùng runtime API của Phaser nhưng lại dùng `import Phaser from "phaser";` thay vì `import * as Phaser from "phaser";` (Namespace import).
   - Khi Next.js render SSR trang `/play` (có chứa `GameBoardView` -> `PhaserArenaCanvas` -> `GameArenaScene` -> `CardLaneRenderer`), Turbopack phân tích tĩnh dependency graph và báo lỗi không tìm thấy `default export` từ `phaser.esm.js`.

### 1.2. Các Bước Đã Thực Hiện
- **Nhóm 1 (Type-Only Imports)**: Đổi thành `import type Phaser from "phaser"` tại:
  - [`CardLaneRenderer.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardLaneRenderer.ts) (thay `Phaser.Math.Clamp` bằng `Math.min/Math.max`).
  - [`ArenaBoardRenderer.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/ArenaBoardRenderer.ts)
  - [`BoardEffectsRenderer.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/BoardEffectsRenderer.ts)
  - [`CardRenderer.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardRenderer.ts)
  - [`CardInteractionSystem.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/CardInteractionSystem.ts)
  - [`ArenaInputSystem.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/ArenaInputSystem.ts)
  - [`arenaTypes.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/types/arenaTypes.ts)
- **Nhóm 2 (Namespace Imports)**: Đổi thành `import * as Phaser from "phaser"` tại:
  - [`GameArenaScene.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts)
  - [`ArenaBackgroundManager.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/ArenaBackgroundManager.ts)
  - [`CombatVFXSystem.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/CombatVFXSystem.ts)
  - [`CardAnimationManager.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/CardAnimationManager.ts)
  - [`TextureLoader.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/TextureLoader.ts)
- **Nhóm 3 (Dynamic Imports)**: Chuẩn hóa pattern `(mod as any).default || mod` tại toàn bộ 9 component canvas.

---

## 2. Sự cố 2: Lỗi setState in Render (`MatchFoundShowcase` -> `OnlinePlayPageContent`)

### 2.1. Nguyên Nhân Cốt Lõi
- **Vị trí**: Tại [`MatchFoundShowcase.tsx`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/matchmaking/MatchFoundShowcase.tsx), trong `setInterval`, hàm `onCompleteRef.current()` (chính là callback `() => setShowcaseCompleted(true)` từ `OnlinePlayPageContent`) được gọi trực tiếp bên trong updater function `setTimeLeft((prev) => { if (prev <= 1) { onCompleteRef.current(); return 0; } })`.
- **Cơ chế React 19 / Fiber**: Updater `(prev) => ...` chạy đồng bộ bên trong reducer tính toán state của `MatchFoundShowcase`. Khi gọi setState của component cha (`setShowcaseCompleted(true)`), React phát hiện việc cập nhật state của component khác khi component hiện tại chưa hoàn tất render, dẫn đến console error.

### 2.2. Đánh giá Luồng Event & Backend Lambda `startMatch.ts`
- Lambda [`startMatch.ts`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Back-end/src/aws-lambdas/startMatch.ts) và WebSocket server đã phát đầy đủ và chính xác các event `matchmaking:searching`, `matchmaking:found`, `room:update`, `match:ended`.
- **Kết luận**: Backend không bị thiếu event hay xung đột logic. Lỗi hoàn toàn thuộc về việc trigger state transition sai vòng đời ở component frontend.

### 2.3. Các Bước Đã Thực Hiện
1. **Tách biệt State Updater & Completion Trigger**:
   - `setTimeLeft((prev) => ...)` chỉ thực hiện đếm ngược số giây thuần túy mà không gọi bất kỳ callback ngoài nào.
   - Thêm `useEffect` chuyên trách theo dõi `timeLeft === 0` để kích hoạt `handleComplete()` ngoài render phase.
2. **Idempotency Guard (`completedRef`)**:
   - Khởi tạo `const completedRef = useRef(false)`.
   - Hàm `handleComplete()` kiểm tra `if (completedRef.current) return; completedRef.current = true; onCompleteRef.current();`.
   - Đảm bảo `onComplete()` chỉ được gọi **đúng duy nhất 1 lần**, loại bỏ triệt để xung đột hay race condition giữa việc đếm hết 10 giây và việc người chơi click nút **"ENTER ARENA NOW"**.
3. **Reset Vòng Đời Trận Đấu**:
   - Thêm `useEffect` tại [`page.tsx`](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/app/play/page.tsx) theo dõi `controller.roomCode` để tự động reset `showcaseCompleted = false` khi người chơi rời trận hoặc trở về sảnh, đảm bảo các trận đấu kế tiếp luôn hiển thị màn hình Showcase chuẩn xác.

---

## 3. Kết Quả Xác Minh (Verification)

1. **TypeScript Type Check**: `npx tsc --noEmit -p Front-end/tsconfig.json` -> **0 lỗi (Exit code 0)**.
2. **Next.js Compilation**: Biên dịch thành công toàn bộ module mà không còn bất kỳ lỗi `Export default` hay `setState in render`.
3. **Console & UI State**: Luồng chuyển cảnh giữa Pre-Search -> Searching Overlay -> Match Found Showcase (10s) -> GameBoard diễn ra mượt mà, không xung đột, console hoàn toàn sạch sẽ.
