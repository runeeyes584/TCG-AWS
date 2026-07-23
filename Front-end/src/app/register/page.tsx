"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail, UserRound, UserRoundPlus } from "lucide-react";
import { register } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");

        if (!username || !email || !password) {
            setError("Please fill in all fields: operative name, email, and password.");
            return;
        }

        try {
            setLoading(true);

            await register(username, email, password);

            // Keep the credential only for the short OTP flow so verification
            // can finish registration with an authenticated redirect to "/".
            // It is removed immediately after confirmation or a failed login.
            window.sessionStorage.setItem("pendingRegistrationEmail", email);
            window.sessionStorage.setItem("pendingRegistrationPassword", password);
            router.replace(`/verify?email=${encodeURIComponent(email)}`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Could not create account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthShell
            eyebrow="New operative"
            title={<>Forge your <em>Identity</em></>}
            description="Create a profile, build your deck, and step into the Prism Arena."
            footer={<>Already have an account? <Link href="/login">Sign in</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                <label className="auth-field">
                    <span>Operative name</span>
                    <div className="auth-input">
                        <UserRound size={17} aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Choose your callsign"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            autoFocus
                            required
                        />
                    </div>
                </label>

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
                            placeholder="Create a secure password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            required
                        />
                        <button type="button" className="auth-password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>
                            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                    </div>
                </label>

                <p className="auth-form__hint">Your email will receive a verification code.</p>

                {error ? <p className="auth-error" role="alert"><AlertCircle size={16} />{error}</p> : null}

                <button type="submit" disabled={loading} className="auth-submit">
                    <UserRoundPlus size={18} />
                    <span>{loading ? "Creating profile..." : "Create operative"}</span>
                </button>
            </form>
        </AuthShell>
    );
}
