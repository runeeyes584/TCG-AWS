"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Eye, EyeOff, KeyRound, LockKeyhole, MailCheck } from "lucide-react";
import { resetPassword } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") ?? "";
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        const normalizedCode = code.trim();

        if (!email) {
            setError("Không tìm thấy email cần đặt lại mật khẩu.");
            return;
        }

        if (!normalizedCode || !password || !confirmPassword) {
            setError("Vui lòng nhập đầy đủ thông tin.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận chưa trùng khớp.");
            return;
        }

        try {
            setLoading(true);

            await resetPassword(email, normalizedCode, password);

            router.push("/login");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Không thể đặt lại mật khẩu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Secure recovery"
            title={<>Restore your <em>Access</em></>}
            description="Xác nhận mã bảo mật và thiết lập mật khẩu mới cho tài khoản."
            footer={<>Không cần đặt lại nữa? <Link href="/login">Return to sign in</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                <div className="auth-destination">
                    <MailCheck size={17} aria-hidden="true" />
                    <span>Recovering account</span>
                    <strong title={email}>{email || "No email supplied"}</strong>
                </div>

                <label className="auth-field">
                    <span>Verification code</span>
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

                <label className="auth-field">
                    <span>New password</span>
                    <div className="auth-input">
                        <LockKeyhole size={17} aria-hidden="true" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a new password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide passwords" : "Show passwords"}>
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </label>

                <label className="auth-field">
                    <span>Confirm new password</span>
                    <div className="auth-input">
                        <LockKeyhole size={17} aria-hidden="true" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Repeat your new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                    </div>
                </label>

                {error ? <p className="auth-error" role="alert"><AlertCircle size={16} />{error}</p> : null}

                <button type="submit" disabled={loading} className="auth-submit">
                    <KeyRound size={18} />
                    <span>{loading ? "Updating credentials..." : "Set new password"}</span>
                </button>
            </form>
        </AuthShell>
    );
}
