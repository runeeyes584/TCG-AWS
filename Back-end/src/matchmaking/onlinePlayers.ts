import { OnlinePlayer } from "../user/user.types";

const onlinePlayers = new Map<string, OnlinePlayer>();

export const OnlinePlayerManager = {

    add(player: OnlinePlayer) {

        onlinePlayers.set(player.socketId, player);
        console.log(`Player ${player.user.username} added to online players.`);

    },

    get(socketId: string) {

        return onlinePlayers.get(socketId);

    },

    remove(socketId: string) {

        onlinePlayers.delete(socketId);

    },

    getAll() {

        return [...onlinePlayers.values()];

    }

};