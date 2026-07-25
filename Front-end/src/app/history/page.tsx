"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, Swords, Trophy, XCircle, MinusCircle, User } from "lucide-react";
import { getMatchHistory, MatchHistory } from "../../libs/api";

export default function MatchHistoryPage() {
    const router = useRouter();
    const [history, setHistory] = useState<MatchHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getMatchHistory()
            .then(res => setHistory(res.history))
            .finally(() => setLoading(false));
    }, []);

    return (
        <main className="history-shell">
            <header className="history-header">
                <button className="history-back" onClick={() => router.back()}>
                    <ArrowLeft size={18} />
                    Back
                </button>

                <h1>Match History</h1>
            </header>

            {loading ? (
                <div className="history-empty">Loading...</div>
            ) : history.length === 0 ? (
                <div className="history-empty">
                    You haven't played any matches yet.
                </div>
            ) : (
                <div className="history-list">
                    {history.map(match => (
                        <div className="history-card" key={match.match_id}>
                            <div className={`history-result ${match.result}`}>
                                {match.result === "WIN" && <Trophy size={20} />}
                                {match.result === "LOSS" && <XCircle size={20} />}
                                {match.result === "DRAW" && <MinusCircle size={20} />}
                                <strong>{match.result}</strong>
                            </div>

                            <div className="history-info">
                                <span>
                                    {match.opponent_avatar ? (
                                        <img
                                            src={match.opponent_avatar}
                                            alt={match.opponent_name ?? match.opponent_id}
                                            className="history-avatar"
                                        />
                                    ) : (
                                        <User size={16} />
                                    )}

                                    <Swords size={15} />

                                    {match.opponent_name ?? match.opponent_id}
                                </span>

                                <span>
                                    <Clock size={15} />
                                    {new Date(match.played_at).toLocaleString()}
                                </span>
                            </div>

                            <div className={`history-elo ${match.rank_point_change >= 0 ? "up" : "down"}`}>
                                {match.rank_point_change > 0 ? "+" : ""}
                                {match.rank_point_change} RP
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
    );
}