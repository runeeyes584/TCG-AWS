# Kế Hoạch Nâng Cấp UI/UX & Visual Effects Cho Champion Cards & Sàn Đấu TCG-AWS

Tài liệu này trình bày kiến trúc chi tiết để nâng cấp trải nghiệm thị giác của **Champion Cards**, hiệu ứng sàn đấu, và các tương tác chiến đấu trong **Phaser 3 WebGL** kết hợp **ReactJS HUD**.

---

## User Review Required

> [!IMPORTANT]
> **Chuyển sang Phaser WebGL Renderer (`Phaser.AUTO`)**:
> - Để kích hoạt **Fragment Shaders** (Hào quang quỷ dị Champion), **Particle Emitters**, và **Screen Shake**, Phaser sẽ chạy ở chế độ **WebGL**.
> - Đảm bảo card artwork CDN hỗ trợ CORS hoặc cung cấp fallback mượt mà cho WebGL textures.

> [!TIP]
> **Tích hợp Spine2D / Spritesheet**:
> - Đối với các thẻ bài chưa có tài nguyên Spine2D/Spritesheet riêng, hệ thống sẽ tự động dùng **Procedural WebGL Idle Breathing** (chuyển động thở, nâng hạ Y, và hiệu ứng ánh sáng bề mặt) để mọi thẻ bài trên sân đều trở nên sống động.

---

## 1. Kiến Trúc Tổng Quan & Luồng Xử Lý

```
┌────────────────────────────────────────────────────────────────────────┐
│                        ReactJS HUD (Overlay Top)                       │
│  - center-info.tsx (Vết nứt ma thuật Mystic Rift, nhịp thở UI)         │
│  - Nexus HP / Floating Damage Numbers / Hand Cards                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ EventBus
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Phaser 3 Engine (WebGL Bottom)                   │
│                                                                        │
│  ├── WebGL Pipelines (Shaders)                                         │
│  │     ├── ChampionAuraPipeline (Fragment Shader aura quỷ dị)          │
│  │     └── SummonGlowPipeline (Glow shader khi triệu hồi)              │
│  │                                                                     │
│  ├── Card & Monster Animation System                                   │
│  │     ├── Spine2D / Spritesheet Idle Breathing (Quái vật thở)         │
│  │     └── CardRenderer (WebGL Sprite Container)                       │
│  │                                                                     │
│  └── Combat VFX System                                                 │
│        ├── Particle Bursts (Hạt va chạm khi đánh)                      │
│        ├── Camera Screen Shake (Rung màn hình)                         │
│        └── Damage & Nexus Impact Visuals                               │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Chi Tiết Thay Đổi Theo File

### A. WebGL Pipeline & Fragment Shaders

#### [MODIFY] [PhaserArenaCanvas.tsx](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/PhaserArenaCanvas.tsx)
- Chuyển `type: Phaser.CANVAS` → `type: Phaser.AUTO` để bật WebGL rendering.
- Đăng ký custom WebGL pipelines (`ChampionAuraPipeline`, `SummonGlowPipeline`).

#### [NEW] [ChampionAuraPipeline.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/pipelines/ChampionAuraPipeline.ts)
- Viết **Fragment Shader (GLSL)** tạo hiệu ứng hào quang quỷ dị cuốn quanh lá bài Champion:
  - Dùng thuật toán Simplex/Perlin Noise cho xoáy ma thuật.
  - Phối màu chuyển động từ tím thẫm (`0x8b5cf6`) sang đỏ huyết (`0xef4444`) và vàng hổ phách (`0xf59e0b`).
  - Hỗ trợ tham số `uTime` nhấp nháy theo nhịp thở.

#### [NEW] [SummonGlowPipeline.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/pipelines/SummonGlowPipeline.ts)
- Shader phát sáng đường viền ô cờ (Slot Glow Shader) khi triệu hồi Unit/Champion:
  - Hiệu ứng vệt sáng quét qua 4 cạnh ô cờ và bùng nổ hạt ánh sáng.

---

### B. Nâng Cấp UI Vết Nứt Ma Thuật (Battle Line Rift)

#### [MODIFY] [center-info.tsx](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/zones/center-info.tsx)
- Thêm component `<MysticRiftDivider />`:
  - Vẽ **Vết nứt ma thuật rực lửa/tím thẫm** cắt ngang giữa 2 hàng bài active.
  - Sử dụng SVG Path vẽ đường nứt kết hợp CSS Filter (`drop-shadow` & `feTurbulence` noise distortion).
  - Animation `animate-mystic-pulse` nhấp nháy theo nhịp thở (breathing pulse).
  - Tích hợp hạt tàn lửa (fire/magic embers) rơi nhẹ quanh đường nứt.

#### [MODIFY] [globals.css](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/app/globals.css)
- Thêm keyframe animations: `@keyframes mystic-rift-pulse`, `@keyframes ember-float`.

---

### C. Spine2D / Spritesheet & Procedural Idle Breathing

#### [NEW] [CardAnimationManager.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/CardAnimationManager.ts)
- Quản lý animation chuyển động cho lá bài trên sân:
  - **Spine2D / Spritesheet Engine**: Load atlas & skeleton cho các quái thú đặc biệt (nếu có tài nguyên).
  - **Procedural Breathing Fallback**: Đối với thẻ bài dạng Texture, áp dụng WebGL float tween (`y += sin(time * 2)`), nhịp thở scale nhẹ (`scale 1.0 <-> 1.025`), và ánh kim bề mặt.

#### [MODIFY] [CardRenderer.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/renders/CardRenderer.ts)
- Tích hợp `CardAnimationManager` và gán `ChampionAuraPipeline` cho container lá bài Champion khi ở trên sân.

---

### D. Combat Interactions: Particles, Screen Shake & Damage VFX

#### [NEW] [CombatVFXSystem.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/systems/CombatVFXSystem.ts)
- **Tấn công (Attack Clash)**:
  - Tạo `Phaser.GameObjects.Particles` khi 2 quái vật lao vào nhau: bắn ra tia lửa ma thuật (spark burst) và sóng xung kích (shockwave).
  - Rung màn hình `this.cameras.main.shake(250, 0.012)`.
- **Hiệu ứng Damage**:
  - Khi Unit chịu sát thương: Bắn hạt nổ sát thương và làm chao đảo lá bài.
  - Khi Nexus chịu sát thương: Bắn chùm tia năng lượng lớn về phía Nexus HUD top/bottom và rung màn hình mạnh hơn (`shake(400, 0.025)`).

#### [MODIFY] [GameArenaScene.ts](file:///k:/Catullus/AWS/Chrono%20Game%20Genesis/Codigo/TCG-AWS/Front-end/src/components/game/phaser/scenes/GameArenaScene.ts)
- Kết nối `CombatVFXSystem` với các sự kiện `ATTACK_UNIT`, `SUMMON_UNIT`, `DAMAGE` từ `arenaEventAdapter`.

---

## 3. Verification Plan

### Automated Verification
- Kiểm tra biên dịch TypeScript toàn bộ dự án:
  ```bash
  npx tsc --noEmit -p Front-end
  ```

### Manual Verification
1. **Triệu hồi (Summoning)**: Triệu hồi card → Xác nhận hiệu ứng ô cờ bùng sáng và hạt ánh sáng xuất hiện.
2. **Champion Aura**: Đặt lá bài Champion lên sân → Xác nhận hào quang xoáy quỷ dị (tím-đỏ-vàng) bao quanh lá bài.
3. **Vết nứt Center Info**: Kiểm tra vạch chia đôi bàn cờ trong `center-info.tsx` có vết nứt ma thuật rực lửa/tím thẫm nhấp nháy theo nhịp thở.
4. **Monster Breathing**: Quan sát lá bài trên sân thở nhẹ và di chuyển mềm mại.
5. **Giao tranh & Screen Shake**: Thực hiện đòn tấn công → Kiểm tra Phaser bắn hạt tia lửa, màn hình rung (Screen Shake), và hiệu ứng sát thương trúng Unit/Nexus.
