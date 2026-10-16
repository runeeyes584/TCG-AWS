"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LockKeyhole, LogIn, Mail, ShieldAlert } from "lucide-react";
import { login } from "../../libs/api";
import { clearCachedProfile, warmupUserSession } from "../../libs/profileCache";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { TextField, FormMessage, FormNotice } from "../../components/ui/form";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingText, setLoadingText] = useState("Authenticating...");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isUnverified, setIsUnverified] = useState(false);

    useEffect(() => {
        clearCachedProfile();
    }, []);

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
            setLoadingText("Authenticating...");

            const result = await login(normalizedEmail, password);
            localStorage.setItem("accessToken", result.accessToken);
            localStorage.setItem("refreshToken", result.refreshToken);
            localStorage.setItem("email", normalizedEmail);

            setLoadingText("Warming up operative uplink...");
            await warmupUserSession();

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
                <TextField
                    label="Email address"
                    icon={<Mail size={17} />}
                    type="email"
                    placeholder="operative@kaleidoscope.gg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                />

                <TextField
                    label="Password"
                    icon={<LockKeyhole size={17} />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    passwordToggle={{ visible: showPassword, onToggle: () => setShowPassword((visible) => !visible), label: showPassword ? "Hide password" : "Show password" }}
                />

                <div className="auth-form__meta">
                    <span>Encrypted session</span>
                    <Link href="/forgot-password">Forgot password?</Link>
                </div>

                {error ? <FormMessage>{error}</FormMessage> : null}

                {isUnverified ? (
                    <FormNotice
                        title="Verification Required"
                        icon={<ShieldAlert size={16} aria-hidden="true" />}
                        actions={
                            <>
                                <Button
                                    size="sm"
                                    iconEnd={<ArrowRight size={14} />}
                                    onClick={() => {
                                        const targetEmail = email.trim().toLowerCase();
                                        if (typeof window !== "undefined" && targetEmail) {
                                            window.sessionStorage.setItem("pendingRegistrationEmail", targetEmail);
                                        }
                                        router.push(`/verify?email=${encodeURIComponent(targetEmail)}&autoResend=1`);
                                    }}
                                >
                                    Verify OTP Code
                                </Button>
                                <Button size="sm" onClick={() => router.push("/register")}>
                                    Register again
                                </Button>
                            </>
                        }
                    >
                        This operative account has an incomplete registration. Please enter your OTP code to complete verification.
                    </FormNotice>
                ) : null}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} loadingText={loadingText} icon={<LogIn size={18} />}>
                    {"Enter the arena"}
                </Button>
            </form>
        </AuthShell>
    );
}
