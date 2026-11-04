"use client";

import { useState, useEffect, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, MailCheck, RefreshCw, Mail } from "lucide-react";
import { login, resendCode, verify } from "../../libs/api";
import { warmupUserSession } from "../../libs/profileCache";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { TextField, FormMessage } from "../../components/ui/form";

export function VerifyForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const paramEmail = searchParams.get("email") ?? "";

    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendSuccess, setResendSuccess] = useState("");
    const [autoResendStarted, setAutoResendStarted] = useState(false);

    // Initialize email from URL param or sessionStorage
    useEffect(() => {
        const urlEmail = paramEmail.trim().toLowerCase();
        if (urlEmail) {
            setEmail(urlEmail);
        } else if (typeof window !== "undefined") {
            const stored = window.sessionStorage.getItem("pendingRegistrationEmail")?.trim().toLowerCase();
            if (stored) {
                setEmail(stored);
            }
        }
    }, [paramEmail]);

    // Handle resend OTP cooldown countdown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => prev - 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pastedData) {
            setCode(pastedData);
        }
    };

    const handleResend = async (targetEmailOverride?: string) => {
        const targetEmail = (targetEmailOverride || email).trim().toLowerCase();
        if (!targetEmail) {
            setError("Please enter your email address to resend the verification code.");
            return;
        }

        try {
            setResendLoading(true);
            setError("");
            setResendSuccess("");

            await resendCode(targetEmail);

            setResendSuccess("A new verification code has been sent! Please check your inbox and spam folder.");
            setResendCooldown(60);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not resend verification code. Please try again.");
        } finally {
            setResendLoading(false);
        }
    };

    useEffect(() => {
        if (!paramEmail || searchParams.get("autoResend") !== "1" || autoResendStarted) return;
        const targetEmail = paramEmail.trim().toLowerCase();
        setAutoResendStarted(true);
        void handleResend(targetEmail);
    }, [paramEmail, autoResendStarted, searchParams]);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setResendSuccess("");
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedCode = code.trim();

        if (!normalizedEmail) {
            setError("Verification email missing. Please enter your email address.");
            return;
        }

        if (!normalizedCode) {
            setError("Please enter the 6-digit verification code.");
            return;
        }

        try {
            setLoading(true);

            await verify(normalizedEmail, normalizedCode);

            const pendingEmail = window.sessionStorage.getItem("pendingRegistrationEmail");
            const pendingPassword = window.sessionStorage.getItem("pendingRegistrationPassword");
            window.sessionStorage.removeItem("pendingRegistrationEmail");
            window.sessionStorage.removeItem("pendingRegistrationPassword");

            if (pendingEmail === normalizedEmail && pendingPassword) {
                try {
                    const result = await login(normalizedEmail, pendingPassword);
                    window.localStorage.setItem("accessToken", result.accessToken);
                    window.localStorage.setItem("refreshToken", result.refreshToken);
                    window.localStorage.setItem("email", normalizedEmail);
                    await warmupUserSession();
                    window.location.replace("/");
                    return;
                } catch {
                    // Verification succeeded. If automatic sign-in fails,
                    // send user to login form.
                }
            }

            router.replace("/login?verified=1");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not verify account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Identity verification"
            title={<>Activate your <em>Profile</em></>}
            description="Enter the 6-digit verification code sent to your email to activate your Prism Network account."
            footer={<>Wrong email address? <Link href="/register">Register again</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                {paramEmail || email ? (
                    <div className="auth-destination">
                        <MailCheck size={17} aria-hidden="true" />
                        <span>Verification code sent to</span>
                        <strong title={email}>{email}</strong>
                    </div>
                ) : (
                    <TextField
                        label="Email address"
                        icon={<Mail size={17} />}
                        type="email"
                        placeholder="operative@kaleidoscope.gg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                    />
                )}

                <TextField
                    label="6-digit verification code"
                    variant="otp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    onPaste={handlePaste}
                    autoFocus
                    required
                />

                <div className="flex items-center justify-between text-xs my-1 text-slate-400">
                    <FormMessage tone="hint">Check your inbox and spam folder if the code has not arrived.</FormMessage>
                    <Button
                        size="sm"
                        onClick={() => handleResend()}
                        disabled={resendLoading || resendCooldown > 0 || !email}
                        icon={<RefreshCw size={13} className={resendLoading ? "animate-spin" : ""} />}
                    >
                        {resendLoading
                            ? "Resending..."
                            : resendCooldown > 0
                            ? `Resend in (${resendCooldown}s)`
                            : "Resend OTP code"}
                    </Button>
                </div>

                {resendSuccess ? <FormMessage tone="success">{resendSuccess}</FormMessage> : null}

                {error ? <FormMessage>{error}</FormMessage> : null}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} loadingText={"Verifying identity..."} icon={<BadgeCheck size={18} />}>
                    {"Verify account"}
                </Button>
            </form>
        </AuthShell>
    );
}

