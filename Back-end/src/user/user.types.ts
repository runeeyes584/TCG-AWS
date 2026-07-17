export interface User {
    id: string;
    email: string;
    username: string;
    elo: number;
    wins: number;
    losses: number;
}

export interface OnlinePlayer {
    socketId: string;
    user: User;
    searching: boolean;
    connectedAt: number;
    queueJoinedAt?: number;
}