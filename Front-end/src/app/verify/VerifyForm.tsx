"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verify } from "../../libs/api";

export function VerifyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const email = searchParams.get("email") ?? "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        if (!code) {
            alert("Vui lòng nhập mã xác thực.");
            return;
        }

        try {
            setLoading(true);

            const result = await verify(email, code);

            alert(result.message || "Verified successfully!");

            router.push("/login");
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-950 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                        <span className="text-3xl">📧</span>
                    </div>

                    <h1 className="text-3xl font-bold text-gray-800">
                        Verify Account
                    </h1>

                    <p className="mt-2 text-black">
                        Nhập mã xác thực đã được gửi tới
                    </p>

                    <p className="mt-1 break-all font-semibold text-blue-600">
                        {email}
                    </p>
                </div>

                <div className="space-y-5">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                            Verification Code
                        </label>

                        <input
                            type="text"
                            placeholder=""
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-center text-lg tracking-[0.3em] uppercase text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        />
                    </div>

                    <button
                        onClick={submit}
                        disabled={loading}
                        className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-blue-300"
                    >
                        {loading ? "Verifying..." : "Verify Account"}
                    </button>
                </div>

                <div className="mt-6 border-t pt-6 text-center">
                    <button
                        onClick={() => router.push("/login")}
                        className="text-sm font-semibold text-blue-600 hover:underline"
                    >
                        ← Quay lại đăng nhập
                    </button>
                </div>
            </div>
        </main>
    );
}
