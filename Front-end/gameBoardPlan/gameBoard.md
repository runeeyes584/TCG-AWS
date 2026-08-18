# Game Board Visual Overhaul — Sci-fi Perspective Board with Effects

Redesign hoàn toàn giao diện bàn cờ Phaser hiện tại: mở rộng mặt phẳng nghiêng (isometric perspective), thêm hiệu ứng sci-fi cho turn-based feedback, breathing lanes cho defend phase, và nâng cấp background atmosphere — tất cả trong Phaser CANVAS renderer.

## Tổng quan hiện trạng

Hiện tại board được render bởi Phaser (CANVAS mode) thông qua:
- [ArenaBoardRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/ArenaBoardRenderer.ts) — Vẽ hình thang (trapezoid) board bằng `fillTriangle`, đường viền tĩnh, và 18 chấm sáng cố định
- [CardLaneRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardLaneRenderer.ts) — Vẽ slot hình chữ nhật đứng (không nghiêng theo perspective)
- [CardRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardRenderer.ts) — Card container với art, stats, frame
- [arenaLayout.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/config/arenaLayout.ts) — Tính toán layout dựa trên `topInset`/`bottomInset` và `tilt`
- [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts) — Scene chính, duyệt 4 rows (2 player × 2 rows), gọi `drawCardLane` và `CardRenderer.create`

> [!IMPORTANT]
> Phaser đang chạy ở **CANVAS mode** (không phải WebGL) vì lý do CORS với card artwork CDN. Điều này có nghĩa:
> - Không dùng được Shader/Pipeline
> - Không dùng được `setTint()` chính xác
> - Phải dùng Graphics API, Tweens, và manual drawing cho mọi hiệu ứng
> - Particle emitter vẫn hoạt động bình thường trong CANVAS mode

## Proposed Changes

---

### 1. Mở rộng Perspective Board — Isometric Trapezoid rộng hơn

#### [MODIFY] [arenaLayout.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/config/arenaLayout.ts)

**Mục tiêu**: Điều chỉnh `topInset` và `bottomInset` để board hình thang mở rộng hơn, fit chuẩn **1920×1080** (lưu ý: user ghi 1920×1880 nhưng đây rõ ràng là 1920×1080 standard).

Thay đổi:
- `topInset`: giảm từ `width * 0.11` → `width * 0.08` (cạnh trên rộng hơn)
- `bottomInset`: giảm từ `width * 0.045` → `width * 0.025` (cạnh dưới rộng hơn)
- `topY`: điều chỉnh nhẹ để board chiếm nhiều diện tích dọc hơn: `height * 0.04` thay vì `0.055`
- `bottomY`: `height * 0.96` thay vì `0.945`

Thêm function mới `getRowInset(y, layout, width)` để tính chính xác inset (lề trái/phải) tại mỗi row Y dựa trên interpolation tuyến tính giữa `topInset` và `bottomInset`. Hàm này phục vụ cho card lanes nghiêng theo perspective.

---

### 2. CardLane Nghiêng theo Perspective

#### [MODIFY] [CardLaneRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardLaneRenderer.ts)

**Mục tiêu**: Card lanes phải **co nhỏ lại ở row gần top** (opponent) và **mở rộng ở row gần bottom** (player), tạo hiệu ứng perspective thực tế.

Thay đổi:
- Thêm tham số `perspectiveScale: number` vào `drawCardLane()` (1.0 = bottom/player, ~0.85 = top/opponent)
- Nhân `width` và `height` với `perspectiveScale` trước khi vẽ
- Giữ nguyên center point (x, y) để alignment không thay đổi

#### [MODIFY] [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts)

Thay đổi:
- Tính `perspectiveScale` cho mỗi row dựa trên vị trí Y: `perspectiveScale = lerp(0.82, 1.0, (y - topY) / (bottomY - topY))`
- Truyền `perspectiveScale` vào `drawCardLane()`
- Áp dụng tương tự cho card size trong `CardRenderer.create()` — card ở opponent rows nhỏ hơn

#### [MODIFY] [arenaLayout.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/config/arenaLayout.ts)

Thêm:
- `getPerspectiveScale(y, topY, bottomY): number` — trả về scale factor dựa trên vị trí dọc
- Cập nhật `getSlotPosition()` để dùng interpolated inset thay vì fixed `left/right`

---

### 3. Hiệu ứng Sci-fi Nhấp nháy khi đến lượt Player (Turn Highlight)

#### [NEW] [BoardEffectsRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/BoardEffectsRenderer.ts)

**Mục tiêu**: Khi đến lượt player (player có priority), 2 board rows của player sẽ có hiệu ứng:
1. **Border glow pulse** — viền sáng xung quanh vùng board (2 rows) nhấp nháy nhẹ
2. **Scanning light line** — đường sáng mỏng chạy vòng quanh viền board rows (sci-fi scanner effect)
3. **Subtle particle dust** — vài hạt ánh sáng nhỏ bay lên từ vùng board

Implementation:
- Một `Phaser.GameObjects.Graphics` layer riêng (depth 0.5, giữa board và slots)
- Dùng `scene.tweens.add()` với `yoyo: true, repeat: -1` cho glow pulse
- Scanning light: tween một điểm sáng di chuyển dọc theo path (4 cạnh board rows), vẽ lại mỗi frame bằng `scene.events.on('update')`
- Color palette: cyan `0x2dd4bf` cho P1, purple `0x9b8cff` cho P2

**State dependency**: Đọc `gameState.priorityPlayerId` và `viewerPlayerId` từ `ArenaStateSystem` để xác định player nào đang có lượt.

---

### 4. CardLane Breathing Effect khi Defend (Block Phase)

#### [MODIFY] [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts)

**Mục tiêu**: Khi `gameState.phase === "BLOCK"`, các CardLane ở **active row** của **defender** (player cần declare blockers) nhấp nháy "thở" để player biết mình phải đặt card vào.

Implementation:
- Tạo thêm một `Phaser.GameObjects.Graphics` layer `defendSlots` (depth 1.5)
- Khi phase === "BLOCK" và player là defender:
  - Vẽ 6 card lanes ở active row với alpha oscillating (tweens `yoyo`)
  - Dùng màu khác biệt: `0xff6b35` (orange-amber) hoặc `0xfbbf24` (gold) để nổi bật
  - Border dashed animation: vẽ đường nét đứt (dash pattern) bằng Graphics API
- Khi phase thay đổi khỏi "BLOCK" → clear layer

#### [MODIFY] [CardLaneRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardLaneRenderer.ts)

Thêm function mới:
```typescript
export function drawDefendCardLane(
  graphics: Phaser.GameObjects.Graphics,
  x: number, y: number, 
  width: number, height: number,
  breathAlpha: number,     // 0.0 → 1.0, controlled by tween
  perspectiveScale: number
)
```

Vẽ lane với:
- Fill color nhạt hơn, amber/gold tone
- Alpha controlled bởi `breathAlpha` (tween bên ngoài)
- Thêm inner glow ring

---

### 5. Background Atmosphere & Board Visual Overhaul

#### [MODIFY] [ArenaBoardRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/ArenaBoardRenderer.ts)

**Mục tiêu**: Redesign hoàn toàn background — mang phong cách **mysterious, dangerous, minimalist sci-fi**.

Thay đổi `render()`:

**A. Background ngoài board (full canvas):**
- Gradient radial từ trung tâm ra: `0x030b17` → `0x010409` (deep space darkness)
- Vignette effect: 4 góc tối hơn bằng `fillRect` với alpha gradient
- Subtle grid lines: vẽ grid mỏng (opacity 0.03-0.06) trên toàn canvas — tạo cảm giác holographic
- Nebula dots: thay 18 chấm tĩnh bằng ~30 dots với vị trí random, colors `0x49d9ff`, `0xa986ff`, `0xff6b9d` (cyan/purple/pink), alpha rất thấp (0.08-0.18)

**B. Board surface (trapezoid):**
- Base fill: `0x060e1e` với alpha 0.96 (tối hơn, sâu hơn)
- Overlay gradient: subtle gradient từ center ra edges bằng nhiều `fillTriangle` layers
- Hexagonal grid pattern bên trong board: vẽ hex grid rất nhạt (opacity 0.04) — tạo cảm giác sci-fi tactical
- Center divider line: nâng cấp từ đường thẳng đơn giản → đường có glow effect (vẽ 3 lần với width và alpha khác nhau)
- Board border: thay `lineStyle` đơn → nhiều layer border với colors khác nhau tạo depth (outer dim → inner bright)
- Corner accents: thêm small geometric marks ở 4 góc board (L-shaped brackets)

**C. Dynamic ambient particles (Phaser tweens):**

#### [NEW] [AmbientParticleSystem.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/AmbientParticleSystem.ts)

- Tạo pool ~20-30 small circles (Phaser.GameObjects.Arc) hoặc Graphics dots
- Mỗi particle: random position trong board, random alpha (0.05-0.2), random size (1-3px)
- Tween: drift chậm lên trên (`y -= random`), fade in/out, loop infinite
- Colors: mix cyan/purple/dim-white
- Performance: destroy/recycle particles khi out of bounds

---

### 6. Integration & Scene Orchestration

#### [MODIFY] [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts)

Tổng hợp tất cả thay đổi vào scene:

```
Depth layers (bottom → top):
  0   — Board background (ArenaBoardRenderer) 
  0.3 — Ambient particles (AmbientParticleSystem)
  0.5 — Turn highlight effects (BoardEffectsRenderer)
  1   — Card lane slots (Graphics)
  1.5 — Defend breathing lanes (Graphics, chỉ khi BLOCK phase)
  2   — Input zones (ArenaInputSystem)
  10+ — Cards (CardRenderer containers)
  80  — Visual event text popups
```

Thay đổi:
- Thêm properties: `boardEffects`, `defendSlots`, `ambientParticles`
- Trong `create()`: khởi tạo `BoardEffectsRenderer`, `AmbientParticleSystem`
- Trong `renderArena()`:
  - Truyền `perspectiveScale` vào card/lane rendering
  - Gọi `boardEffects.update()` với current priority/phase state
  - Gọi `defendSlots` rendering khi `phase === "BLOCK"`
- Subscribe thêm `scene.events.on('update', ...)` cho animated effects
- Cleanup tất cả trong `destroyScene()`

---

### 7. Cập nhật Event Bus để truyền Phase Info

#### [MODIFY] [arenaEventBus.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/libs/arenaEventBus.ts)

Thêm event type (nếu cần):
```typescript
PHASE_CHANGE: { phase: GamePhase; priorityPlayerId: PlayerId; defenderId?: PlayerId };
```

> [!NOTE]
> Hiện tại `UPDATE_SLOTS` đã emit khi gameState thay đổi, và scene đọc trực tiếp từ `arenaStoreAdapter.getState()`. Có thể **không cần** event mới — chỉ cần đọc `gameState.phase` và `gameState.priorityPlayerId` trong `renderArena()`. Tuy nhiên, cho animated effects cần biết **khi nào** phase thay đổi (để start/stop tweens), nên thêm event sẽ clean hơn.

---

## Tóm tắt Files

| File | Action | Mô tả |
|------|--------|-------|
| [arenaLayout.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/config/arenaLayout.ts) | MODIFY | Mở rộng board, thêm `getPerspectiveScale()`, `getRowInset()` |
| [ArenaBoardRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/ArenaBoardRenderer.ts) | MODIFY | Redesign background: vignette, hex grid, nebula, glow borders |
| [CardLaneRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardLaneRenderer.ts) | MODIFY | Thêm `perspectiveScale`, thêm `drawDefendCardLane()` |
| [CardRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardRenderer.ts) | MODIFY | Áp dụng perspective scale cho card size |
| [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts) | MODIFY | Orchestrate tất cả: perspective, effects, defend, ambient |
| [BoardEffectsRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/BoardEffectsRenderer.ts) | NEW | Sci-fi turn highlight: glow pulse, scanning light, particles |
| [AmbientParticleSystem.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/AmbientParticleSystem.ts) | NEW | Background floating particles cho atmosphere |
| [arenaEventBus.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/libs/arenaEventBus.ts) | MODIFY | (Optional) Thêm `PHASE_CHANGE` event |

## User Review Required

> [!IMPORTANT]
> **Kích thước màn hình**: User ghi "1920 × 1880" — đây có phải là typo và ý là **1920 × 1080** (Full HD standard) không? Plan này assume 1920×1080. Nếu thực sự là 1920×1880 (nearly square), layout sẽ cần điều chỉnh khác biệt đáng kể.

> [!WARNING]
> **CANVAS mode limitation**: Toàn bộ hiệu ứng phải dùng Graphics API + Tweens. Không có GPU shader, không có blend mode nâng cao, không có WebGL pipeline. Hiệu ứng sẽ đẹp nhưng không thể đạt mức shader-based glow. Nếu muốn unlock full visual potential, cần giải quyết CORS issue với card CDN (thêm `Access-Control-Allow-Origin` headers) để chuyển sang WebGL mode.

## Open Questions

> [!IMPORTANT]
> 1. **Board size 1920×1080?** 
> 2. **Scanning light speed**: Đường sáng chạy vòng quanh board mất bao lâu 1 vòng? Plan mặc định ~3-4 giây.

## Verification Plan

### Manual Verification
1. Mở game ở **1920×1080**, xác nhận board hình thang rộng hơn, card lanes nghiêng đúng perspective
2. Chơi đến lượt player → xác nhận hiệu ứng glow pulse + scanning light xuất hiện ở 2 rows player
3. Trigger BLOCK phase → xác nhận active row của defender có breathing effect
4. Kiểm tra visual background: vignette, hex grid subtle, ambient particles floating
5. Resize browser window → xác nhận responsive, không bị vỡ layout
6. Kiểm tra performance: FPS ổn định ≥55 fps trên mid-range hardware
