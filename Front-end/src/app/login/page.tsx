"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import { login } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!email || !password) {
            setError("Vui lòng nhập đầy đủ email và mật khẩu.");
            return;
        }

        try {
            setLoading(true);

            const result = await login(email, password);
            localStorage.setItem("accessToken", result.accessToken);
            localStorage.setItem("refreshToken", result.refreshToken);
            localStorage.setItem("email", email);
            router.push("/play");

        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Không thể đăng nhập. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Operative access"
            title={<>Return to the <em>Arena</em></>}
            description="Đăng nhập để tiếp tục hành trình trong Prism Arena."
            footer={<>Chưa có tài khoản? <Link href="/register">Create operative</Link></>}
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

                <label className="auth-field">
                    <span>Password</span>
                    <div className="auth-input">
                        <LockKeyhole size={17} aria-hidden="true" />
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="current-password"
                            required
                        />
                        <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </label>

                <div className="auth-form__meta">
                    <span>Encrypted session</span>
                    <Link href="/forgot-password">Quên mật khẩu?</Link>
                </div>

                {error ? <p className="auth-error" role="alert"><AlertCircle size={16} />{error}</p> : null}

                <button type="submit" disabled={loading} className="auth-submit">
                    <LogIn size={18} />
                    <span>{loading ? "Authenticating..." : "Enter the arena"}</span>
                </button>
            </form>
        </AuthShell>
    );
}
