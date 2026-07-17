import { MatchmakingQueue } from "./matchmakingQueue";
import { OnlinePlayerManager } from "./onlinePlayers";
import type { OnlinePlayer } from "../user/user.types";

export interface MatchResult {
    player1: OnlinePlayer;
    player2: OnlinePlayer;
}

export const MatchmakingService = {

    enqueue(socketId: string): MatchResult | null {

        const player = OnlinePlayerManager.get(socketId);

        if (!player) {
            return null;
        }

        if (player.searching) {
            return null;
        }

        player.searching = true;
        player.queueJoinedAt = Date.now();

        MatchmakingQueue.enqueue(player);

        const players = MatchmakingQueue.getPlayers();

        if (players.length < 2) {
            return null;
        }

        const player1 = players.shift()!;
        const player2 = players.shift()!;

        player1.searching = false;
        player2.searching = false;

        return {
            player1,
            player2
        };
    },

    remove(socketId: string) {

        MatchmakingQueue.remove(socketId);

        const player = OnlinePlayerManager.get(socketId);

        if (player) {
            player.searching = false;
        }
    }

};