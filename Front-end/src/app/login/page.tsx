"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, LogIn, Mail, ShieldAlert } from "lucide-react";
import { login } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isUnverified, setIsUnverified] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setIsUnverified(false);

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail || !password) {
            setError("Please fill in both email and password fields.");
            return;
        }

        try {
            setLoading(true);

            const result = await login(normalizedEmail, password);
            localStorage.setItem("accessToken", result.accessToken);
            localStorage.setItem("refreshToken", result.refreshToken);
            localStorage.setItem("email", normalizedEmail);
            window.location.replace("/");

        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Could not log in. Please try again.";
            setError(msg);
            if (/not verified|incomplete|xác thực/i.test(msg)) {
                setIsUnverified(true);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Operative access"
            title={<>Return to the <em>Arena</em></>}
            description="Log in to continue your journey in the Prism Arena."
            footer={<>Don't have an account? <Link href="/register">Create operative</Link></>}
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
                    <Link href="/forgot-password">Forgot password?</Link>
                </div>

                {error ? <p className="auth-error" role="alert"><AlertCircle size={16} />{error}</p> : null}

                {isUnverified ? (
                    <div className="auth-notice" role="alert">
                        <div className="auth-notice__header">
                            <ShieldAlert size={16} aria-hidden="true" />
                            <span>Verification Required</span>
                        </div>
                        <p className="auth-notice__body">
                            This operative account has an incomplete registration. Please enter your OTP code to complete verification.
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                            <button
                                type="button"
                                onClick={() => {
                                    const targetEmail = email.trim().toLowerCase();
                                    if (typeof window !== "undefined" && targetEmail) {
                                        window.sessionStorage.setItem("pendingRegistrationEmail", targetEmail);
                                    }
                                    router.push(`/verify?email=${encodeURIComponent(targetEmail)}&autoResend=1`);
                                }}
                                className="auth-notice__action"
                            >
                                <span>Verify OTP Code</span>
                                <ArrowRight size={14} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => router.push("/register")}
                                className="auth-notice__action"
                                style={{ opacity: 0.85 }}
                            >
                                <span>Register again</span>
                            </button>
                        </div>
                    </div>
                ) : null}

                <button type="submit" disabled={loading} className="auth-submit">
                    <LogIn size={18} />
                    <span>{loading ? "Authenticating..." : "Enter the arena"}</span>
                </button>
            </form>
        </AuthShell>
    );
}
