"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { register } from "../../libs/api";

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
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Create Account
                    </h1>
                    <p className="mt-2 text-gray-500">
                        Đăng ký để bắt đầu sử dụng Kaleidoscope TCG
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Username
                        </label>

                        <input
                            type="text"
                            placeholder="Your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full rounded-lg border text-gray-900 border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="example@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border text-gray-900 border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border text-gray-900 border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-green-300"
                    >
                        {loading ? "Registering..." : "Create Account"}
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Đã có tài khoản?{" "}
                    <button
                        onClick={() => router.push("/login")}
                        className="font-semibold text-blue-600 hover:underline"
                    >
                        Đăng nhập
                    </button>
                </div>
            </div>
        </main>
    );
}