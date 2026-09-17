"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, ArrowLeft } from "lucide-react";
import { PhaserSplash } from "./PhaserSplash";
import { me } from "../../libs/api";
import { clearCachedProfile, setCachedProfile } from "../../libs/profileCache";

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
    if (!animatedBackdrop) {
      return <AuthGateLoadingState message={loadingMessage || "Verifying connection"} />;
    }
    return (
      <main className="matchmaking-shell" style={{ minHeight: "100vh" }}>
        <div className="matchmaking-grid" aria-hidden="true" />
        <div className="matchmaking-art" aria-hidden="true">
          <PhaserSplash />
        </div>
        <div className="matchmaking-shade" aria-hidden="true" />
        
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px", zIndex: 10, position: "relative" }}>
          <p className="lobby-eyebrow" style={{ margin: 0 }}>{loadingMessage || "Verifying connection"}</p>
          <div className="leaderboard-state" style={{ minHeight: "auto" }}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  if (status === "unauthenticated") {
    if (!animatedBackdrop) {
      return (
        <AuthGateShell>
          <div className="rank-leaderboard-locked auth-gate-locked">
            <ShieldCheck size={38} />
            <p className="lobby-eyebrow">Restricted Access <span /></p>
            <h1>Authentication<br /><em>Required</em></h1>
            <p className="lobby-lede auth-gate-copy">
              You must be signed in with an active session to access this terminal.
            </p>
            <div className="auth-gate-actions">
              <button className="queue-action queue-action--small" onClick={() => router.push("/")}>
                <ArrowLeft size={16} /> Return to Lobby
              </button>
              <button className="queue-action queue-action--small" onClick={() => router.push("/login")}>
                <LogIn size={16} /> Sign In
              </button>
            </div>
          </div>
        </AuthGateShell>
      );
    }
    return (
      <main className="matchmaking-shell" style={{ minHeight: "100vh" }}>
        <div className="matchmaking-grid" aria-hidden="true" />
        <div className="matchmaking-art" aria-hidden="true">
          <PhaserSplash />
        </div>
        <div className="matchmaking-shade" aria-hidden="true" />
        
        <div className="rank-leaderboard-locked" style={{ zIndex: 10, margin: "auto", position: "relative", padding: "40px" }}>
          <ShieldCheck size={38} />
          <p className="lobby-eyebrow">Restricted Access <span /></p>
          <h1>Authentication<br /><em>Required</em></h1>
          <p className="lobby-lede" style={{ marginTop: "14px", marginBottom: "20px" }}>
            You must be signed in with an active session to access this terminal.
          </p>
          
          <div style={{ display: "flex", gap: "12px" }}>
            <button className="queue-action queue-action--small" onClick={() => router.push("/")} style={{ background: "rgba(15, 23, 42, 0.6)" }}>
              <ArrowLeft size={16} /> Return to Lobby
            </button>
            <button className="queue-action queue-action--small" onClick={() => router.push("/login")}>
              <LogIn size={16} /> Sign In
            </button>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

function AuthGateShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="matchmaking-shell auth-gate-shell">
      <div className="matchmaking-grid" aria-hidden="true" />
      <div className="matchmaking-shade" aria-hidden="true" />
      {children}
    </main>
  );
}

function AuthGateLoadingState({ message }: { message: string }) {
  return (
    <AuthGateShell>
      <div className="auth-gate-status" role="status" aria-live="polite">
        <p className="lobby-eyebrow">{message}</p>
        <div className="leaderboard-state" style={{ minHeight: "auto" }}>
          <span />
          <span />
          <span />
        </div>
      </div>
    </AuthGateShell>
  );
}
