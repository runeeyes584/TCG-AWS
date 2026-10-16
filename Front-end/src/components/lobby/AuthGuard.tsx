"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, ArrowLeft } from "lucide-react";
import { PhaserSplash } from "./PhaserSplash";
import { me } from "../../libs/api";
import { PageShell, Eyebrow, Lede } from "../ui/layout";
import { StatusPanel } from "../ui/feedback";
import styles from "./AuthGuard.module.css";
import { clearCachedProfile, getCachedProfile, setCachedProfile } from "../../libs/profileCache";
import { Button } from "../ui/button";

interface AuthGuardProps {
  children: React.ReactNode;
  loadingMessage?: string;
  loadingComponent?: React.ReactNode;
  animatedBackdrop?: boolean;
}

export function AuthGuard({
  children,
  loadingMessage,
  loadingComponent,
  animatedBackdrop = true,
}: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let mounted = true;
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      clearCachedProfile();
      if (mounted) setStatus("unauthenticated");
      return;
    }

    const cached = getCachedProfile();
    if (cached && mounted) {
      setStatus("authenticated");
    }

    me()
      .then(({ success, user }) => {
        if (!mounted) return;
        if (success && user) {
          setCachedProfile({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            elo: user.elo,
            wins: user.wins,
            losses: user.losses,
          });
          setStatus("authenticated");
        } else {
          clearCachedProfile();
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        if (!mounted) return;
        clearCachedProfile();
        setStatus("unauthenticated");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <AuthGateLoadingState
        message={loadingMessage || "Verifying connection"}
        animated={animatedBackdrop}
      />
    );
  }

  if (status === "unauthenticated") {
    return (
      <PageShell centered art={animatedBackdrop ? <PhaserSplash /> : undefined}>
        <div className={`rank-leaderboard-locked ${styles.locked}`}>
          <ShieldCheck size={38} />
          <Eyebrow line>Restricted Access</Eyebrow>
          <h1>Authentication<br /><em>Required</em></h1>
          <Lede snug>
            You must be signed in with an active session to access this terminal.
          </Lede>
          <div className={styles.actions}>
            <Button icon={<ArrowLeft size={16} />} onClick={() => router.push("/")}>
              Return to Lobby
            </Button>
            <Button variant="primary" icon={<LogIn size={16} />} onClick={() => router.push("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return <>{children}</>;
}

export function AuthGateLoadingState({
  message,
  animated = false,
}: {
  message: string;
  animated?: boolean;
}) {
  return (
    <PageShell centered art={animated ? <PhaserSplash /> : undefined}>
      <div className={styles.status} role="status" aria-live="polite">
        <Eyebrow flush>{message}</Eyebrow>
        <StatusPanel status="loading" compact />
      </div>
    </PageShell>
  );
}
