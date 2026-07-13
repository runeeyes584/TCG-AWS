# Context
This is a multiplayer Turn-based Card Game (TCG) using a TypeScript state machine (`engine.ts`) and Socket.io (`server/index.ts`). 
Your task is to implement an AFK/Timeout system (Option 1: Reduced Time Penalty).

# Game Rules
- Normal turn duration: 30 seconds.
- If a player times out without taking any action, their turn ends. Their next turn will be reduced to 15 seconds.
- If they take a valid action, their AFK streak resets, and subsequent turns return to 25 seconds.
- If they time out 3 times in a row, they immediately lose the game.
- Server must add a 2-second buffer to the timer to account for network latency.

# Implementation Steps

Please implement the following changes step-by-step. Ensure the code is clean, type-safe, and follows existing architectural patterns.

### Step 1: Update Types (`Back-end/src/game/types.ts`)
Add the following fields to track timer and AFK state:
- `PlayerState`: Add `consecutiveAfkCount: number`.
- `GameState`: Add `turnStartTime: number` and `turnDuration: number`.
- `GameAction`: Add `{ type: "TIME_OUT"; playerId: PlayerId }`.
- `VisualEvent`: Add `{ type: "AFK_WARNING"; playerId: PlayerId; afkCount: number }`.

### Step 2: Update Engine Logic (`Back-end/src/game/engine.ts`)
- **Initialization:** In `createInitialGameState`, set `consecutiveAfkCount = 0` for all players, `turnStartTime = Date.now()`, and `turnDuration = 30000`.
- **Reset AFK Count:** In `applyAction`, for any valid player-driven action (e.g., `PLAY_UNIT`, `END_TURN`, etc., EXCEPT `TIME_OUT`), reset `consecutiveAfkCount = 0` for the `playerId` who made the action.
- **Handle `TIME_OUT`:** Create logic for the `TIME_OUT` action:
  - Increment `consecutiveAfkCount` for the timed-out player.
  - If `consecutiveAfkCount >= 3`: End the game immediately by setting `winnerId` to the opponent.
  - If `< 3`: Pass priority/end turn (mirroring `END_TURN` logic). Add a `VisualEvent` of type `AFK_WARNING`.
- **Set Turn Duration:** Whenever the `priorityPlayerId` or turn changes, calculate the new duration:
  - If the new priority player has `consecutiveAfkCount > 0`, set `turnDuration = 10000`.
  - Else, set `turnDuration = 25000`.
  - Update `turnStartTime = Date.now()`.

### Step 3: Implement Server Timer (`Back-end/src/server/index.ts`)
- Create a `Map<string, NodeJS.Timeout>` to track active timers per room code.
- Create a `refreshTimer(room: Room)` function:
  - Clear existing timer for the room.
  - Calculate delay: `room.state.turnDuration + 2000` (2s buffer).
  - Use `setTimeout` to automatically dispatch a `TIME_OUT` action for the `room.state.priorityPlayerId` when time expires.
  - Apply the action to the state and call `broadcastRoom(room)`.
- Call `refreshTimer(room)` whenever:
  - A game starts (e.g., in `room:join` when player 2 connects).
  - A valid action is successfully applied in `game:action`.
- Clear the timer on `disconnect` if the room is destroyed.

### Step 4: Frontend UI (Client-Side Game Component)
- Add a visual countdown timer reading `turnStartTime` and `turnDuration` from the synced GameState (using `requestAnimationFrame` or `setInterval` for smooth UI update).
- Listen to the state's `visualEvents` array:
  - If `AFK_WARNING` with `afkCount === 1`: Display a toast message: "Bạn đã bỏ lỡ lượt. Lượt sau chỉ còn 10s."
  - If `AFK_WARNING` with `afkCount === 2`: Display a prominent red popup: "Cảnh báo AFK! Lượt sau bạn sẽ bị xử thua nếu tiếp tục không thao tác."
