"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, LockKeyhole, MailCheck } from "lucide-react";
import { resetPassword } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { TextField, FormMessage } from "../../components/ui/form";

export function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const rawEmail = searchParams.get("email") ?? "";
    const email = rawEmail.trim().toLowerCase();

    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pastedData) {
            setCode(pastedData);
        }
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        const normalizedCode = code.trim();

        if (!email) {
            setError("Reset email address missing. Please start password recovery again.");
            return;
        }

        if (!normalizedCode || !password || !confirmPassword) {
            setError("Please fill in all required fields.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Password confirmation does not match.");
            return;
        }

        try {
            setLoading(true);

            await resetPassword(email, normalizedCode, password);

            router.push("/login");
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not reset password. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Secure recovery"
            title={<>Restore your <em>Access</em></>}
            description="Confirm your security code and create a new password for your account."
            footer={<>Cancel password reset? <Link href="/login">Return to sign in</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                <div className="auth-destination">
                    <MailCheck size={17} aria-hidden="true" />
                    <span>Recovering account</span>
                    <strong title={email}>{email || "No email supplied"}</strong>
                </div>

                <TextField
                    label="Verification code"
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

                <TextField
                    label="New password"
                    icon={<LockKeyhole size={17} />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    passwordToggle={{ visible: showPassword, onToggle: () => setShowPassword((visible) => !visible), label: showPassword ? "Hide passwords" : "Show passwords" }}
                />

                <TextField
                    label="Confirm new password"
                    icon={<LockKeyhole size={17} />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Repeat your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                />

                {error ? <FormMessage>{error}</FormMessage> : null}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} loadingText={"Updating credentials..."} icon={<KeyRound size={18} />}>
                    {"Set new password"}
                </Button>
            </form>
        </AuthShell>
    );
}

