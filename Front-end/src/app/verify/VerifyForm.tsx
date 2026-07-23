"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, BadgeCheck, MailCheck } from "lucide-react";
import { login, verify } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";

export function VerifyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const email = searchParams.get("email") ?? "";

    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        const normalizedCode = code.trim();

        if (!email) {
            setError("Không tìm thấy email cần xác thực. Vui lòng đăng ký lại.");
            return;
        }

        if (!normalizedCode) {
            setError("Vui lòng nhập mã xác thực.");
            return;
        }

        try {
            setLoading(true);

            await verify(email, normalizedCode);

            const pendingEmail = window.sessionStorage.getItem("pendingRegistrationEmail");
            const pendingPassword = window.sessionStorage.getItem("pendingRegistrationPassword");
            window.sessionStorage.removeItem("pendingRegistrationEmail");
            window.sessionStorage.removeItem("pendingRegistrationPassword");

            if (pendingEmail === email && pendingPassword) {
                try {
                    const result = await login(email, pendingPassword);
                    window.localStorage.setItem("accessToken", result.accessToken);
                    window.localStorage.setItem("refreshToken", result.refreshToken);
                    window.localStorage.setItem("email", email);
                    window.location.replace("/");
                    return;
                } catch {
                    // Verification succeeded. If automatic sign-in is rejected,
                    // send the user to the normal login form rather than asking
                    // them to submit the now-consumed OTP again.
                }
            }

            router.replace("/login?verified=1");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Không thể xác thực tài khoản. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Identity verification"
            title={<>Activate your <em>Profile</em></>}
            description="Nhập mã OTP để hoàn tất kết nối tài khoản với Prism Network."
            footer={<>Sai địa chỉ email? <Link href="/register">Register again</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                <div className="auth-destination">
                    <MailCheck size={17} aria-hidden="true" />
                    <span>Verification code sent to</span>
                    <strong title={email}>{email || "No email supplied"}</strong>
                </div>

                <label className="auth-field">
                    <span>6-digit verification code</span>
                    <div className="auth-input auth-input--otp">
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            maxLength={6}
                            placeholder="000000"
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\s/g, ""))}
                            autoFocus
                            required
                        />
                    </div>
                </label>

                <p className="auth-form__hint">Check your inbox and spam folder if the message has not arrived.</p>

                {error ? <p className="auth-error" role="alert"><AlertCircle size={16} />{error}</p> : null}

                <button type="submit" disabled={loading} className="auth-submit">
                    <BadgeCheck size={18} />
                    <span>{loading ? "Verifying identity..." : "Verify account"}</span>
                </button>
            </form>
        </AuthShell>
    );
}
