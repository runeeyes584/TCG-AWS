"use client";

import { useState } from "react";
import { Copy, LogIn, Plus, Wifi } from "lucide-react";
import { GameBoardView } from "../components/GameBoard";
import { useSocketGame } from "./useSocketGame";

export function MultiplayerDuel() {
  const controller = useSocketGame();
  const [joinCode, setJoinCode] = useState("");

  if (controller.roomCode && controller.localPlayerId) {
    return (
      <GameBoardView
        controller={controller}
        localPlayerId={controller.localPlayerId}
        connectionStatus={`${controller.status} · Room ${controller.roomCode}`}
      />
    );
  }

  return (
    <main className="socket-lobby">
      <section className="socket-lobby-panel">
        <div className="socket-lobby-kicker">
          <Wifi size={18} aria-hidden="true" />
          Local Socket Duel
        </div>
        <h1>Battle With A Friend</h1>
        <p>
          Start a local room, share the code, then play from two browser windows.
          The server owns the game state and hides the opponent hand.
        </p>

        <div className="socket-actions">
          <button type="button" onClick={controller.createRoom}>
            <Plus size={18} aria-hidden="true" />
            Create Room
          </button>
          <label className="room-code-field">
            <span>Room Code</span>
            <input
              maxLength={5}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABCDE"
              value={joinCode}
            />
          </label>
          <button
            type="button"
            disabled={joinCode.trim().length === 0}
            onClick={() => controller.joinRoom(joinCode)}
          >
            <LogIn size={18} aria-hidden="true" />
            Join Room
          </button>
        </div>

        <div className="socket-status">
          <strong>{controller.status}</strong>
          {controller.error ? <span>{controller.error}</span> : null}
        </div>
      </section>

      <section className="socket-lobby-help">
        <h2>How to test locally</h2>
        <ol>
          <li>Run the socket server script.</li>
          <li>Open this page in two browser windows.</li>
          <li>Create a room in the first window.</li>
          <li>Join that code from the second window.</li>
        </ol>
        <div className="socket-command">
          <Copy size={16} aria-hidden="true" />
          <code>npm run dev:socket</code>
        </div>
      </section>
    </main>
  );
}
