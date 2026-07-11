"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../libs/api"; // hoặc "../../libs/api" nếu chưa cấu hình alias

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!email || !password) {
            alert("Vui lòng nhập đầy đủ email và mật khẩu.");
            return;
        }

        try {
            setLoading(true);

            const result = await login(email, password);

            alert(result.message || "Đăng nhập thành công!");

            router.push("/");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 40 }}>
            <h1>Login</h1>

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
                {loading ? "Logging in..." : "Login"}
            </button>
        </div>
    );
}