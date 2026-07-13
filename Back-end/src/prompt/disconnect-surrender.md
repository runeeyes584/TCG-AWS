# Context & Goal
We are working on a multiplayer Turn-based Card Game (TCG) and you are a full-stack developer using Next.js, Socket.io, and a TypeScript state machine (`engine.ts`).

**Goal:** Implement a "Disconnect & Reconnect" mechanism combined with the AFK timeout system, and add a "Surrender" feature.

# Business Rules
1. **AFK Timers:** Normal turn is 30s. If a player times out, their `consecutiveAfkCount` increases. If `consecutiveAfkCount > 0`, their turn duration becomes 15s. If it reaches 3, they lose the game.
2. **Disconnects:** If a socket disconnects, the game does NOT pause and the room is NOT destroyed. The player is marked as disconnected. The AFK system will naturally handle their timeout. If they rejoin using the same room code, they resume their session.
3. **Surrender:** A player can explicitly surrender, which immediately ends the game and gives the opponent the win.

# Implementation Steps

Please implement the following steps. Ensure the code is robust and type-safe.

### Step 1: Types & Engine Logic (`Back-end/src/game/types.ts` & `engine.ts`)
1. **types.ts**: 
   - Add `{ type: "SURRENDER"; playerId: PlayerId }` to the `GameAction` union type.
2. **engine.ts**:
   - In `applyAction`, handle the `SURRENDER` action: immediately set `state.winnerId` to the opponent (`playerId === "P1" ? "P2" : "P1"`) and return the state.
   - Update the turn duration logic (where `turnDuration` is assigned): if the new priority player has `consecutiveAfkCount > 0`, set `turnDuration = 15000` (15s). Otherwise, set `turnDuration = 30000` (30s). 
   - *(Note: Assume the `TIME_OUT` action and `consecutiveAfkCount` logic from the previous AFK feature is already in place. Just update the numbers and add Surrender).*

### Step 2: Server Disconnect & Reconnect Logic (`Back-end/src/server/index.ts`)
Update how the socket server handles player connections:
1. **RoomPlayer interface**: Add `connected: boolean` to the `RoomPlayer` interface.
2. **room:join**: When attaching a player (or if they are rejoining), set their `connected = true` and update their `socketId`.
3. **disconnect event**: 
   - Instead of removing the player from `room.players`, find the player and set `player.connected = false`.
   - Add a log: `"A player disconnected."`
   - DO NOT delete the room if a player disconnects, unless both players are gone or the game is already over (optional cleanup).
   - Call `broadcastRoom(room)` so the opponent knows.
4. **broadcastRoom**: Modify the `opponentConnected` flag in the payload. Instead of `room.players.length === 2`, check if the opponent's `connected` flag is `true`.

### Step 3: Frontend UI (`Front-end/src/components/GameBoard.tsx` or similar)
1. **Surrender Button**: Add a "Đầu hàng" (Surrender) button somewhere visible in the UI (e.g., near the player's profile or options menu). When clicked, it should trigger: `socket.emit("game:action", { type: "SURRENDER", playerId: myPlayerId })`. Include a confirmation dialog (`window.confirm`) to prevent misclicks.
2. **Disconnect UI**: You receive `opponentConnected` from the socket state. If `opponentConnected` is `false`, display a clear UI indicator (e.g., a Toast message or a text badge over the opponent's avatar) saying: *"Đối thủ đã mất kết nối. Đang chờ kết nối lại..."*
