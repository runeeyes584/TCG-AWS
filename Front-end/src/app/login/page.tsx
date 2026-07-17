"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "../../libs/api";

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
            localStorage.setItem("accessToken", result.accessToken);
            localStorage.setItem("refreshToken", result.refreshToken);
            localStorage.setItem("email", email);
            router.push("/play");

            // alert(result.message || "Đăng nhập thành công!");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 flex items-center justify-center px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">
                        Welcome Back
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Đăng nhập để tiếp tục
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="example@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg text-gray-900 border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>

                        <input
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded-lg border text-gray-900 border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                        />

                        <div className="mt-2 flex justify-end">
                            <button
                                type="button"
                                onClick={() => router.push("/forgot-password")}
                                className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                Quên mật khẩu?
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 active:scale-[0.99] transition disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                        {loading ? "Logging in..." : "Login"}
                    </button>
                </div>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Chưa có tài khoản?{" "}
                    <button
                        onClick={() => router.push("/register")}
                        className="font-semibold text-blue-600 hover:underline"
                    >
                        Đăng ký ngay
                    </button>
                </div>
            </div>
        </div>
    );
}