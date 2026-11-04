"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockKeyhole, LogIn, Mail, ShieldAlert, UserRound, UserRoundPlus } from "lucide-react";
import { register } from "../../libs/api";
import { AuthShell } from "../../components/auth/AuthShell";
import { Button } from "../../components/ui/button";
import { TextField, FormMessage, FormNotice } from "../../components/ui/form";

export default function RegisterPage() {
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isExistingUser, setIsExistingUser] = useState(false);
    const [usernameError, setUsernameError] = useState("");
    const [isCooldown, setIsCooldown] = useState(false);

    const validateInputs = (normEmail: string, normUsername: string, pass: string): string | null => {
        if (!normUsername || !normEmail || !pass) {
            return "Please fill in all fields: operative name, email, and password.";
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normEmail)) {
            return "Invalid email address format.";
        }
        if (normUsername.length < 3 || normUsername.length > 20) {
            return "Username must be between 3 and 20 characters.";
        }
        if (!/^[A-Za-z0-9_]+$/.test(normUsername)) {
            return "Username can only contain letters, numbers, and underscores.";
        }
        if (pass.length < 8) {
            return "Password must be at least 8 characters long.";
        }
        if (!/[A-Z]/.test(pass)) {
            return "Password must contain at least one uppercase letter (A-Z).";
        }
        if (!/[a-z]/.test(pass)) {
            return "Password must contain at least one lowercase letter (a-z).";
        }
        if (!/[0-9]/.test(pass)) {
            return "Password must contain at least one number (0-9).";
        }
        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
            return "Password must contain at least one special character (e.g. !@#$%^&*).";
        }
        return null;
    };

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError("");
        setIsExistingUser(false);
        setUsernameError("");
        setIsCooldown(false);

        const normalizedEmail = email.trim().toLowerCase();
        const normalizedUsername = username.trim();

        const validationError = validateInputs(normalizedEmail, normalizedUsername, password);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            setLoading(true);

            // A new registration owns the pending verification session.
            window.sessionStorage.removeItem("pendingRegistrationEmail");
            window.sessionStorage.removeItem("pendingRegistrationPassword");

            const result = await register(normalizedUsername, normalizedEmail, password);

            window.sessionStorage.setItem("pendingRegistrationEmail", normalizedEmail);
            if (!result.resumedUnconfirmed) {
                window.sessionStorage.setItem("pendingRegistrationPassword", password);
            } else {
                // The existing UNCONFIRMED user keeps its original password.
                // Do not attempt automatic login with the newly typed password.
                window.sessionStorage.removeItem("pendingRegistrationPassword");
            }
            router.replace(`/verify?email=${encodeURIComponent(normalizedEmail)}&autoResend=0`);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Could not create account. Please try again.";
            const errorCode = typeof err === "object" && err !== null && "code" in err
                ? (err as { code?: string }).code
                : undefined;
            setError(msg);
            if (errorCode === "EMAIL_ALREADY_REGISTERED" || /already exist|already registered/i.test(msg)) {
                setIsExistingUser(true);
            }
            if (errorCode === "CALLSIGN_TAKEN" || /callsign.*taken|username.*taken/i.test(msg)) {
                setUsernameError(`Callsign '${normalizedUsername}' is already taken.`);
            }
            if (errorCode === "EMAIL_DELETION_COOLDOWN" || /recently deleted|24 hours/i.test(msg)) {
                setIsCooldown(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const normalizedEmail = email.trim().toLowerCase();

    return (
        <AuthShell
            eyebrow="New operative"
            title={<>Forge your <em>Identity</em></>}
            description="Create a profile, build your deck, and step into the Prism Arena."
            footer={<>Already have an account? <Link href="/login">Sign in</Link></>}
        >
            <form className="auth-form" onSubmit={submit} noValidate>
                <TextField
                    label="Operative name"
                    icon={<UserRound size={17} />}
                    type="text"
                    placeholder="Choose your callsign"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                />
                {usernameError ? <FormMessage tone="inline">{usernameError}</FormMessage> : null}

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

                <TextField
                    label="Password"
                    icon={<LockKeyhole size={17} />}
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a secure password (8+ chars, A-Z, 0-9, special)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    passwordToggle={{ visible: showPassword, onToggle: () => setShowPassword((visible) => !visible), label: showPassword ? "Hide password" : "Show password" }}
                />

                <FormMessage tone="hint">Password requires at least 8 characters including uppercase, lowercase, numbers, and special characters.</FormMessage>

                {error ? <FormMessage>{error}</FormMessage> : null}

                {isExistingUser ? (
                    <FormNotice
                        title="Account Already Exists"
                        icon={<ShieldAlert size={16} aria-hidden="true" />}
                        actions={
                            <Button size="sm" fullWidth icon={<LogIn size={14} />} onClick={() => router.push("/login")}>
                                Sign in to operative profile
                            </Button>
                        }
                    >
                        An operative profile registered to <strong>{normalizedEmail}</strong> already exists in the Prism Network. Please sign in to access your profile.
                    </FormNotice>
                ) : null}

                <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} loadingText={"Creating profile..."} icon={<UserRoundPlus size={18} />}>
                    {"Create operative"}
                </Button>
            </form>
        </AuthShell>
    );
}

