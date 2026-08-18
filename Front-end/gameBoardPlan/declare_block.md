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