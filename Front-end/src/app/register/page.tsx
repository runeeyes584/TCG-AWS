"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../libs/api"; // hoặc ../../libs/api

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!username || !email || !password) {
            alert("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        try {
            setLoading(true);

            const result = await register(username, email, password);

            alert(result.message || "Verification code sent.");

            router.push(`/verify?email=${encodeURIComponent(email)}`);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 40 }}>
            <h1>Register</h1>

            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />

            <br />
            <br />

            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />

            <br />
            <br />

            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <br />
            <br />

            <button onClick={submit} disabled={loading}>
                {loading ? "Registering..." : "Register"}
            </button>
        </div>
    );
}