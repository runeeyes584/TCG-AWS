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
