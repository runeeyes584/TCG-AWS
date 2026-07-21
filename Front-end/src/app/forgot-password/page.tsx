"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, KeyRound, Mail } from "lucide-react";
import { forgotPassword } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!email) {
            setError("Vui lòng nhập email của tài khoản.");
            return;
        }

        try {
            setLoading(true);

            await forgotPassword(email);

            router.push(
                `/reset-password?email=${encodeURIComponent(email)}`
            );
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Không thể gửi mã xác thực. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Account recovery"
            title={<>Recover your <em>Access</em></>}
            description="Nhập email đã đăng ký. Prism Network sẽ gửi mã xác thực để đặt lại mật khẩu."
            footer={<>Đã nhớ mật khẩu? <Link href="/login">Return to sign in</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                <label className="auth-field">
                    <span>Email address</span>
                    <div className="auth-input">
                        <Mail size={17} aria-hidden="true" />
                        <input
                            type="email"
                            placeholder="operative@kaleidoscope.gg"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            autoFocus
                            required
                        />
                    </div>
                </label>

                <p className="auth-form__hint">The verification code will be valid for a limited time.</p>

                {error ? <p className="auth-error" role="alert"><AlertCircle size={16} />{error}</p> : null}

                <button type="submit" disabled={loading} className="auth-submit">
                    <KeyRound size={18} />
                    <span>{loading ? "Transmitting code..." : "Send verification code"}</span>
                </button>
            </form>
        </AuthShell>
    );
}
