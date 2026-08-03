# Kế Hoạch Nâng Cấp Nền Tảng Sàn Đấu Bài (Hybrid PhaserJS 3 + ReactJS Modern Arena)

Tài liệu này trình bày kế hoạch kiến trúc chi tiết để biến giao diện bàn cờ 2D phẳng hiện tại của **TCG-AWS** thành một **Sàn đấu 2.5D có góc nghiêng chiều sâu (Perspective Arena)** sinh động, đạt tiêu chuẩn các tựa game bài thế hệ mới (Hearthstone, Yu-Gi-Oh! Master Duel, Legends of Runeterra).

---

## 1. Phân Tích Kiến Trúc & Đánh Giá Khả Năng Tích Hợp

### 1.1 Khả năng kết hợp Phaser 3 với ReactJS/NextJS & Thư viện hiện có
- **Hoàn toàn khả thi và là chuẩn mực hàng đầu (Best Practice)** trong phát triển Web Game TCG hiện đại.
- **Mô hình Hybrid (2 Lớp Độc Lập)**:
  - **Dưới (Phaser 3 Canvas - WebGL)**: Đảm nhận Bàn cờ nghiêng 2.5D, các ô đặt quái (Slots), hiệu ứng quái ra sân, animation tấn công/tiêu diệt, tia sét ma thuật, hiệu ứng hạt Particle VFX, bóng đổ, và điều khiển Camera (Tilt/Zoom/Pan).
  - **Trên (ReactJS HUD Overlay)**: Đảm nhận Bài trên tay (Hand Cards), Thanh Máu Player/Opponent (Nexus HP), Nút Pass/Surrender, Bảng Log, Modal chi tiết thẻ bài (`HoverContext`). Giữ nguyên ưu thế của TailwindCSS, Framer-Motion, Shadcn UI (chữ sắc nét, giao diện cực kỳ mượt và linh hoạt).

### 1.2 Luồng Truyền Dữ Liệu: Zustand + EventBus Bridge Pattern
```
                                 ┌─────────────────────────────────┐
                                 │      WebSocket Server (AWS)     │
                                 └────────────────┬────────────────┘
                                                  │ (room:update)
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │     React: useGameMatch Hook    │
                                 └────────────────┬────────────────┘
                                                  │
                                                  ▼
                                 ┌─────────────────────────────────┐
                                 │   Zustand Store / EventBus      │
                                 └────────┬────────────────┬───────┘
                                          │                │
            (State Changes / Events)      │                │  (Player Interactions)
                                          ▼                ▼
    ┌───────────────────────────────────────┐    ┌───────────────────────────────────────┐
    │     Phaser 3 Canvas (2.5D Arena)      │    │    React HUD Overlay (Hand/HP/Log)   │
    │  - Render 3D Tilting Board            │    │  - Framer-Motion Cards in Hand        │
    │  - Unit Battle Animations & VFX       │    │  - HoverContext Detail Modals         │
    │  - Attack Arrows & Dissolve Effects   │    │  - Pass & Surrender Buttons           │
    └───────────────────────────────────────┘    └───────────────────────────────────────┘
```

---

## 2. Các Template & Kỹ Thuật Phaser 3 Phù Hợp Cho Game Bài Quái Thú (Monster Card Game)

### 2.1 Phaser 3 + React Hybrid Template Engine
Tạo mô hình Scene quản lý theo hướng Sự Kiện (Event-Driven Phaser Scene):
1. `PreloadScene`: Nạp trước Spritesheet quái thú, Texture mặt sân, Particle Texture (Spark, Fire, Glow, Smoke, Shockwave).
2. `Arena25DScene`: Scene chính dựng bàn cờ góc nghiêng 2.5D.
3. `FXPipelineScene`: Sub-scene layer chuyên vẽ các hiệu ứng ánh sáng (Glow), đường đạn/mũi tên nhắm mục tiêu (Targeting Bezier Curve Arrow), và Tia năng lượng.

### 2.2 Kỹ Thuật Bàn Cờ 2.5D Nghiêng & Chiều Sâu (Perspective / Isometric Grid)
- **Matrix Transformation & Perspective Mesh**: Sử dụng Transform Matrix 2.5D hoặc Phaser 3 Mesh Object để tạo độ nghiêng góc bàn cờ (Tilt angle $30^\circ - 45^\circ$).
- **Depth / Z-Sorting**: Các quái ở hàng trên (Opponent) thu nhỏ lại nhẹ theo thấu kính xa gần, quái ở hàng dưới (Player) to hơn và rõ nét hơn.
- **Dynamic Camera View Controller**:
  - Hỗ trợ nút xoay/nghiêng góc bàn cờ (Preset: Dynamic View, Top-down Classic View, Cinematic Battle View).
  - Skew/Parallax effect khi rê chuột xung quanh màn hình.

### 2.3 Hệ Thống Hiệu Ứng Game (Game VFX & Animations)
- **Unit Attack Tweens**: Quái phóng tới đâm/chém quái đối phương rồi bật về vị trí cũ (Spring Ease animation).
- **Targeting Arrow (Mũi tên nhắm mục tiêu)**: Khi kéo thả thẻ bài/kỹ năng, Phaser vẽ đường cong Bezier phát sáng nối từ nguồn đến mục tiêu con trỏ chuột.
- **Dissolve / Particle Shatter**: Quái hết máu bị tan vỡ thành hạt năng lượng dạt về phía Graveyard.
- **Champion Entrance**: Quái huyền thoại/Champion ra sân kích hoạt hiệu ứng chớp sáng (Shockwave burst) và khói mờ xung quanh ô cờ.

---

## 3. Các Bước Triển Khai Chi Tiết (Proposed Changes)

### Component 1: Zustand Game Bridge Store
#### [NEW] [useGameStore.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/stores/useGameStore.ts)
- Quản lý trạng thái chia sẻ giữa Phaser và React:
  - `gameState`: Trạng thái bàn cờ từ WebSocket.
  - `selectedEntity`: Thẻ bài/Quái đang chọn.
  - `hoveredEntity`: Thẻ bài/Quái đang hover.
  - `targetingLine`: Điểm bắt đầu và kết thúc của đường nhắm mục tiêu.
  - `cameraSettings`: Góc nghiêng (tilt angle), khoảng cách (zoom level).

### Component 2: Phaser 3 Arena Scene & Render Engines
#### [NEW] [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/phaser/scenes/GameArenaScene.ts)
- Dựng bàn cờ 2.5D góc nghiêng.
- Render 6 ô Summon Player & 6 ô Summon Opponent với texture viền Neon 3D.
- Lắng nghe event từ `EventBus` để chạy animation:
  - `SUMMON_UNIT`: Tạo Sprite quái vật hạ cánh từ trên cao xuống ô cờ.
  - `ATTACK_UNIT`: Chạy animation lao sang tấn công.
  - `DESTROY_UNIT`: Chạy particle explode.
  - `UPDATE_SLOTS`: Đồng bộ vị trí quái theo `GameState`.

#### [NEW] [PhaserArenaCanvas.tsx](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/PhaserArenaCanvas.tsx)
- Wrapper React component nhúng Phaser Game Instance dạng Canvas linh hoạt bên dưới HUD.
- Xử lý Resize Window mượt mà không làm méo hình.

### Component 3: Nâng Cấp GameBoard Hybrid UI
#### [MODIFY] [GameBoard.tsx](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/GameBoard.tsx)
- Tách phần Render Grid HTML 2D phẳng hiện tại ra.
- Nhúng `<PhaserArenaCanvas />` ở lớp nền background.
- Giữ lớp `<Hand />`, `<NexusPanel />`, `<PassButton />`, `<HoverProvider>` ở lớp Foreground Overlay.
- Tích hợp điều khiển góc nhìn Camera View Control (Nút Tilt 3D / Top-down View ở góc màn hình).

---

## 4. Kế Hoạch Kiểm Thử & Kiểm Tra (Verification Plan)

### 4.1 Kiểm Tra Tương Thích & Hiệu Năng
1. **FPS & Render Test**: Kiểm tra tốc độ khung hình (duy trì 60 FPS) khi có nhiều hiệu ứng particle nổ trên bàn cờ.
2. **State Synchronization**: Kiểm tra đảm bảo mọi hành động (Attack, Play Spell, Pass Turn) từ WebSocket phản ứng chính xác lên Phaser Canvas mà không làm rơi lượt hay lệch state.
3. **Responsive & Camera Drag**: Kiểm tra giao diện trên nhiều độ phân giải màn hình khác nhau (Desktop Full HD, 2K, Màn hình di động).

### 4.2 Kiểm Tra Sự Cố (Edge Cases)
1. **Reconnect/Resume Match**: Khôi phục lại đúng vị trí 2.5D của toàn bộ quái trên bàn cờ sau khi người chơi tải lại trang hoặc rớt mạng.
2. **Hover Sync**: Kiểm tra rê chuột vào quái trong Phaser canvas mở đúng Detail Panel ở React `HoverContext`.
