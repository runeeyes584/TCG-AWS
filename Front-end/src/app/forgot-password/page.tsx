"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Mail } from "lucide-react";
import { forgotPassword } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { TextField, FormMessage } from "../../components/ui/form";

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedEmail) {
            setError("Please enter your registered account email address.");
            return;
        }

        try {
            setLoading(true);

            await forgotPassword(normalizedEmail);

            router.push(
                `/reset-password?email=${encodeURIComponent(normalizedEmail)}`
            );
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not send verification code. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="Account recovery"
            title={<>Recover your <em>Access</em></>}
            description="Enter your registered email address. Prism Network will send a verification code to reset your password."
            footer={<>Remembered your password? <Link href="/login">Return to sign in</Link></>}
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

                <FormMessage tone="hint">The verification code will be valid for a limited time.</FormMessage>

                {error ? <FormMessage>{error}</FormMessage> : null}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} loadingText={"Transmitting code..."} icon={<KeyRound size={18} />}>
                    {"Send verification code"}
                </Button>
            </form>
        </AuthShell>
    );
}
