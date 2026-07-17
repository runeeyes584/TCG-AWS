import { OnlinePlayer } from "../user/user.types";

const queue: OnlinePlayer[] = [];

export const MatchmakingQueue = {

    enqueue(player: OnlinePlayer) {

        if (queue.find(x => x.socketId === player.socketId)) {
            return;
        }

        player.searching = true;
        player.queueJoinedAt = Date.now();

        queue.push(player);

    },

    remove(socketId: string) {

        const index = queue.findIndex(x => x.socketId === socketId);

        if (index !== -1) {

            queue[index].searching = false;

            queue.splice(index, 1);

        }

    },

    getPlayers() {

        return queue;

    }

};