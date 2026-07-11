"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verify } from "../../libs/api"; // hoặc ../../libs/api

export default function VerifyPage() {
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
        <div style={{ padding: 40 }}>
            <h1>Verify Account</h1>

            <p>Email: {email}</p>

            <input
                type="text"
                placeholder="Verification Code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
            />

            <br />
            <br />

            <button onClick={submit} disabled={loading}>
                {loading ? "Verifying..." : "Verify"}
            </button>
        </div>
    );
}