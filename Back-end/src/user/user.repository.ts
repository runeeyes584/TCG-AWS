import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { User } from "./user.types";
import { calculateElo } from "../matchmaking/elo";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE = path.join(__dirname, "../data/user.json");
let matchResultWriteQueue: Promise<void> = Promise.resolve();

export async function getUsers(): Promise<User[]> {
    const json = await fs.readFile(FILE, "utf8");
    return JSON.parse(json);
}

export async function saveUsers(users: User[]) {
    await fs.writeFile(
        FILE,
        JSON.stringify(users, null, 2)
    );
}

export async function getUserByEmail(email: string) {
    const users = await getUsers();
    return users.find((u) => u.email === email);
}

export async function getUserById(id: string) {
    const users = await getUsers();
    return users.find((u) => u.id === id);
}

export async function updateUser(user: User) {
    const users = await getUsers();

    const index = users.findIndex((u) => u.id === user.id);

    if (index === -1) {
        throw new Error("User not found");
    }

    users[index] = user;

    await saveUsers(users);
}

export function recordMatchResult(winnerId: string, loserId: string): Promise<{ winner: User; loser: User }> {
    const task = matchResultWriteQueue.then(async () => {
        const users = await getUsers();
        const winner = users.find((user) => user.id === winnerId);
        const loser = users.find((user) => user.id === loserId);

        if (!winner || !loser) {
            throw new Error("Cannot record a match result for an unknown user.");
        }

        const ratings = calculateElo(winner.elo, loser.elo, "A");
        winner.elo = ratings.playerA;
        winner.wins += 1;
        loser.elo = ratings.playerB;
        loser.losses += 1;

        await saveUsers(users);
        return { winner, loser };
    });

    matchResultWriteQueue = task.then(
        () => undefined,
        () => undefined
    );
    return task;
}
