"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "../../libs/api";

export default function ResetPasswordPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!code || !password) {
            alert("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        try {
            setLoading(true);

            const result = await resetPassword(
                email,
                code,
                password
            );

            alert(result.message || "Password changed successfully.");

            router.push("/login");
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
                        Reset Password
                    </h1>

                    <p className="mt-2 text-gray-500 break-all">
                        {email}
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Verification Code
                        </label>

                        <input
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center tracking-[0.3em] uppercase text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            New Password
                        </label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading
                            ? "Resetting..."
                            : "Reset Password"}
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => router.push("/login")}
                        className="text-sm font-medium text-blue-600 hover:underline"
                    >
                        ← Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </div>
    );
}