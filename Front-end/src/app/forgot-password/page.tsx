"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { forgotPassword } from "../../libs/api";

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");

    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!email) {
            alert("Vui lòng nhập email.");
            return;
        }

        try {
            setLoading(true);

            const result = await forgotPassword(email);

            alert(result.message || "Verification code sent.");

            router.push(
                `/reset-password?email=${encodeURIComponent(email)}`
            );
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
                        Forgot Password
                    </h1>

                    <p className="mt-2 text-gray-500">
                        Nhập email để nhận mã xác thực.
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                            Email
                        </label>

                        <input
                            type="email"
                            placeholder="example@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                    >
                        {loading ? "Sending..." : "Send Verification Code"}
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