"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Clipboard, Hash, Radio, ShieldCheck, Users, X } from "lucide-react";
import { GameBoardView } from "../game/GameBoard";
import { PhaserSplash } from "./PhaserSplash";
import { useGameMatch } from "../../hooks/useGameMatch";

type PrivateRoomMode = "create" | "join";

export function PrivateRoomScreen(props: {
  mode: PrivateRoomMode;
  initialRoomCode?: string;
}) {
  const router = useRouter();
  const normalizedRoomCode = props.initialRoomCode?.trim().toUpperCase();
  const validJoinCode = normalizedRoomCode && /^[A-HJ-NP-Z2-9]{6}$/.test(normalizedRoomCode)
    ? normalizedRoomCode
    : undefined;
  const controller = useGameMatch(props.mode === "join" ? validJoinCode : undefined);
  const createRequestedRef = useRef(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (
      props.mode !== "create" ||
      createRequestedRef.current ||
      controller.status !== "Connected"
    ) {
      return;
    }
    createRequestedRef.current = true;
    controller.createRoom();
  }, [controller, props.mode]);

  if (controller.inGame && controller.roomCode && controller.localPlayerId) {
    return (
      <GameBoardView
        controller={controller}
        localPlayerId={controller.localPlayerId}
        opponentConnected={controller.opponentConnected}
        connectionStatus={`${controller.status} · Room ${controller.roomCode}`}
      />
    );
  }

  const roomCode = controller.roomCode || validJoinCode;
  const invalidJoinCode = props.mode === "join" && !validJoinCode;

  const leaveRoom = () => {
    if (controller.roomCode && !controller.inGame) controller.cancelMatchmaking();
    router.push("/");
  };

  const copyRoomCode = async () => {
    if (!roomCode) return;
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="matchmaking-shell private-room-shell">
      <div className="matchmaking-grid" aria-hidden="true" />
      <div className="matchmaking-art" aria-hidden="true"><PhaserSplash /></div>
      <div className="matchmaking-shade" aria-hidden="true" />

      <header className="matchmaking-header">
        <button className="matchmaking-back" onClick={leaveRoom} aria-label="Return to lobby">
          <ArrowLeft size={18} />
          <span>Lobby</span>
        </button>
        <div className="matchmaking-title"><span>KALEIDOSCOPE</span><small>PRIVATE CIRCUIT</small></div>
        <span className="private-room-connection"><Radio size={15} /> {controller.status}</span>
      </header>

      <section className="matchmaking-content">
        <div className="matchmaking-kicker"><Users size={15} /> Friendly duel</div>
        <h1>{props.mode === "create" ? <>Invite a <em>friend</em></> : <>Joining private <em>room</em></>}</h1>
        <p className="matchmaking-lede">
          {props.mode === "create"
            ? "Share the room code below. The duel starts only after your friend joins."
            : `Connecting to private room ${validJoinCode || ""}.`}
        </p>

        <section className="matchmaking-console private-room-console" aria-live="polite">
          <div className="matchmaking-console__top">
            <div className="matchmaking-player">
              <div className="matchmaking-avatar"><Hash size={25} /></div>
              <div>
                <strong>{props.mode === "create" ? "Private room host" : "Private room guest"}</strong>
                <span><ShieldCheck size={13} /> Authenticated WebSocket</span>
              </div>
            </div>
          </div>

          <div className="private-room-code-panel">
            <small>Room code</small>
            <strong>{roomCode || (invalidJoinCode ? "INVALID" : "······")}</strong>
            <span>
              {invalidJoinCode
                ? "The room link is invalid. Return to the lobby and enter a six-character code."
                : controller.opponentConnected
                  ? "Opponent connected. Preparing the duel..."
                  : controller.status}
            </span>
          </div>

          {controller.error ? <p className="matchmaking-error">{controller.error}</p> : null}

          {props.mode === "create" && roomCode ? (
            <button className="matchmaking-command" onClick={copyRoomCode}>
              {copied ? <Check size={19} /> : <Clipboard size={19} />}
              {copied ? "Code copied" : "Copy room code"}
            </button>
          ) : null}
          <button className="matchmaking-command matchmaking-command--cancel" onClick={leaveRoom}>
            <X size={19} /> Leave room
          </button>
        </section>
      </section>
    </main>
  );
}
