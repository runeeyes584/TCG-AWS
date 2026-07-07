# TCG Game Architecture

Tài liệu này mô tả kiến trúc của thư mục `Back-end/src/game`, tập trung vào cấu trúc, chức năng của các file, các lệnh CLI và workflow của TCG engine.

## 1. Cấu trúc thư mục (Trees case)

```text
Back-end/src/game/
├── data/
│   └── cards.json            # Dữ liệu định nghĩa gốc của tất cả các lá bài (JSON)
├── operations/               # Chứa các file logic xử lý các hành động cơ bản lên state
│   ├── buff.ts               # Logic tăng/giảm chỉ số, thêm keyword
│   ├── damage.ts             # Logic xử lý sát thương
│   ├── discard.ts            # Logic vứt bài
│   ├── draw.ts               # Logic rút bài
│   ├── heal.ts               # Logic hồi máu
│   ├── index.ts              
│   └── summon.ts             # Logic triệu hồi unit ra sân
├── abilities.ts              # Xử lý các kỹ năng bị động/kích hoạt của bài
├── cardRegistry.ts           # Đăng ký và tra cứu dữ liệu gốc của bài từ system
├── cards.ts                  # Hàm tiện ích quản lý và khởi tạo các lá bài/unit instance
├── deckRules.ts              # Logic kiểm tra bộ bài có hợp lệ không (deck validation)
├── effects.ts                # Hệ thống quản lý hàng đợi kỹ năng và hiệu ứng phép thuật (Queue)
├── engine.ts                 # Core Engine xử lý State, nhận và thực thi mọi GameAction
├── events.ts                 # Định nghĩa các Event Type (Sự kiện)
├── graveyard.ts              # Quản lý khu vực mộ (Graveyard) và bài chết
├── rules.ts                  # Các quy tắc cứng, hằng số (MAX_MANA, limits) và hàm kiểm tra tính hợp lệ
├── sampleCards.ts            # Dữ liệu thẻ mẫu để test/demo
├── triggers.ts               # Hệ thống phát (emit) sự kiện để kích hoạt ability
└── types.ts                  # Nơi tập trung định nghĩa Interface/Type (GameState, Unit, Card...)
```

*(Lưu ý: Các file `*.test.ts` nằm cùng cấp được dùng cho unit test của từng module tương ứng và đã được ẩn để dễ nhìn).*

---

## 2. Các file, chức năng và liên kết

* **`engine.ts`**: Trái tim của Game Engine.
  * **Hàm chính**: `applyAction`, `updateChampionProgress`, `createInitialGameState`, `runCleanupPipeline`.
  * **Liên kết**: Gắn kết hầu như toàn bộ hệ thống (`cardRegistry.ts`, `effects.ts`, `triggers.ts`, `operations/...`).
* **`types.ts`**: Nơi khai báo kiểu dữ liệu.
  * **Hàm chính**: Chứa các TypeScript interface quan trọng: `GameState`, `CardDefinition`, `GameAction`.
  * **Liên kết**: Được import bởi 100% các file khác trong folder `game`.
* **`rules.ts`**: Luật chơi tĩnh.
  * **Hàm chính**: `validateAction`, `checkWinConditions`.
* **`cards.ts` & `cardRegistry.ts`**: Quản lý thẻ bài.
  * **Hàm chính**: `createCardInstance`, `registerCardDefinition`, `getCardDefinition`.
* **`effects.ts` & `abilities.ts`**: Hệ thống kỹ năng và Spell Queue.
  * **Hàm chính**: `enqueueEffect`, `resolveEffectQueue`, `executeTriggeredAbilities`.
  * **Liên kết**: Gọi đến `engine.ts` và `triggers.ts` để thao tác state dựa trên skill.
* **`triggers.ts` & `events.ts`**: Hệ thống lắng nghe sự kiện (Event Driven).
  * **Hàm chính**: `emitEvent`. Nhận một action và báo hiệu cho toàn hệ thống (bắn sát thương, gọi bài...)
* **`graveyard.ts`**:
  * **Hàm chính**: `moveUnitToGraveyard`, `cleanupDeadUnits`. Xóa sổ unit hết HP.
* **Folder `operations/`**:
  * **Chức năng**: Các atomic functions (hàm đơn nguyên) để thay đổi chỉ số nhỏ gọn: `dealDamage`, `drawCards`, `summonUnit`. Phục vụ cho `engine.ts` hoặc các `effects`.

---

## 3. Các lệnh CLI (Commands)

Dựa trên cấu hình `package.json`, dưới đây là các lệnh thao tác dự án:

* **Cài đặt thư viện / gói (Dependencies)**:
  ```bash
  npm install
  ```
* **Chạy chương trình (Development)**:
  ```bash
  npm run dev
  ```
* **Chạy Test (Kiểm tra logic game engine)**:
  ```bash
  npm run test        # Chạy test một lần
  npm run test:watch  # Chạy test ở chế độ theo dõi (tự chạy lại khi file đổi)
  ```
* **Build (Đóng gói cho production)**:
  ```bash
  npm run build
  ```
* **Chạy chương trình (Production)**:
  ```bash
  npm run start
  ```

*(Bạn cũng có thể dùng `yarn` hoặc `pnpm` thay cho `npm` nếu đã cài đặt).*

---

## 4. Workflow cơ bản của TCG Engine

Mô hình hoạt động của game là **State Machine** kết hợp **Event-Driven**:

1. **Khởi tạo Game (Init)**: 
   Hệ thống gọi `createInitialGameState` (trong `engine.ts`), load bài mẫu từ `cards.json` (thông qua `cardRegistry.ts`), khởi tạo người chơi, bốc bài ban đầu (`drawCards`).
2. **Nhận Hành động (Action)**:
   Người chơi tạo ra một `GameAction` (VD: Đánh bài, Kéo bài để chặn).
3. **Xác thực (Validation)**:
   `engine.ts` truyền action vào `validateAction` (`rules.ts`) để đảm bảo nước đi đúng luật (đủ mana, đúng Phase).
4. **Cập nhật State (Apply & Operations)**:
   Engine gọi các file trong `operations/` hoặc thao tác trực tiếp state. (VD: trừ mana, chuyển lá bài từ tay xuống bàn qua `summonUnit`).
5. **Phát sự kiện (Emit Triggers)**:
   Mỗi hành động gây ra (VD: triệu hồi xong) sẽ kích hoạt `emitEvent` trong `triggers.ts`.
6. **Xử lý kỹ năng (Abilities & Effects)**:
   Các Event vừa phát ra sẽ được `abilities.ts` quét qua các thẻ bài. Nếu bài có kỹ năng phản hồi với Event đó, hiệu ứng (Effect) sẽ được đẩy vào hàng đợi (`enqueueEffect`).
7. **Dọn dẹp & Xác định kết quả (Cleanup & Win Check)**:
   Cuối chuỗi thao tác, engine tự động chạy `cleanupDeadUnits` (chuyển unit máu <= 0 vào mộ `graveyard.ts`) và check xem Nexus (nhà chính) của ai bị hủy qua `checkWinConditions`.
