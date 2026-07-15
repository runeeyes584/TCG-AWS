import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { User } from "./user.types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FILE = path.join(__dirname, "../data/user.json");

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