import type { SavedDeck } from "../decks/deck.types";

export interface User {
    id: string;
    email: string;
    username: string;
    avatar?: string;
    elo: number;
    wins: number;
    losses: number;
    decks?: Record<string, SavedDeck>;
}

export interface OnlinePlayer {
    socketId: string;
    user: User;
    searching: boolean;
    connectedAt: number;
    queueJoinedAt?: number;
}
