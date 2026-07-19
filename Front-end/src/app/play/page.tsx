"use client";

import { GameBoard } from "../../components/game/GameBoard";
import { useGameMatch } from "../../hooks/useGameMatch";

function formatTime(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function PlayPage() {
    const controller = useGameMatch();

    if (controller.roomCode && controller.opponentConnected) {
        return <GameBoard controller={controller} />;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
            <div className="w-full max-w-md rounded-2xl bg-slate-800 p-8 shadow-xl">

                <h1 className="text-center text-3xl font-bold text-white">
                    Chrono Genesis
                </h1>

                <p className="mt-2 text-center text-slate-300">
                    Ranked Matchmaking
                </p>

                <div className="mt-8 rounded-xl bg-slate-700 p-5">
                    <p className="text-slate-300">
                        Connection
                    </p>

                    <p className="text-lg font-semibold text-green-400">
                        {controller.status}
                    </p>

                    {controller.error && (
                        <p className="mt-2 text-sm text-red-400">
                            {controller.error}
                        </p>
                    )}
                </div>

                {!controller.searching ? (
                    <button
                        onClick={controller.startMatchmaking}
                        className="mt-8 w-full rounded-xl bg-blue-600 py-4 text-lg font-semibold text-white transition hover:bg-blue-700"
                    >
                        ▶ Play Game
                    </button>
                ) : (
                    <div className="mt-8">

                        <button
                            onClick={controller.cancelMatchmaking}
                            className="w-full rounded-xl bg-red-600 py-4 text-lg font-semibold text-white transition hover:bg-red-700"
                        >
                            Cancel Search
                        </button>

                        <div className="mt-6 text-center">
                            <p className="text-slate-300">
                                Searching for opponent...
                            </p>

                            <p className="mt-2 text-4xl font-bold text-white">
                                {formatTime(controller.queueTime)}
                            </p>
                        </div>
                    </div>
                )}

                <div className="mt-10 rounded-xl border border-slate-600 p-4">
                    <div className="flex justify-between">
                        <span className="text-slate-400">
                            Room
                        </span>

                        <span className="text-white">
                            {controller.roomCode ?? "-"}
                        </span>
                    </div>

                    <div className="mt-3 flex justify-between">
                        <span className="text-slate-400">
                            Player
                        </span>

                        <span className="text-white">
                            {controller.localPlayerId ?? "-"}
                        </span>
                    </div>

                    <div className="mt-3 flex justify-between">
                        <span className="text-slate-400">
                            Opponent
                        </span>

                        <span
                            className={
                                controller.opponentConnected
                                    ? "font-semibold text-green-400"
                                    : "text-yellow-400"
                            }
                        >
                            {controller.opponentConnected
                                ? "Connected"
                                : "Waiting..."}
                        </span>
                    </div>
                </div>
            </div>
        </main>
    );
}