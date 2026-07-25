"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogIn, ArrowLeft } from "lucide-react";
import { PhaserSplash } from "./PhaserSplash";
import { me } from "../../libs/api";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    let mounted = true;
    const token = window.localStorage.getItem("accessToken");
    if (!token) {
      if (mounted) setStatus("unauthenticated");
      return;
    }

    me()
      .then(({ success, user }) => {
        if (!mounted) return;
        if (success && user) {
          setStatus("authenticated");
        } else {
          // Token invalid or expired
          window.localStorage.removeItem("accessToken");
          window.localStorage.removeItem("refreshToken");
          window.localStorage.removeItem("email");
          setStatus("unauthenticated");
        }
      })
      .catch((err) => {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (
          msg.includes("expired") ||
          msg.includes("hash") ||
          msg.includes("Unauthorized") ||
          msg.includes("token") ||
          msg.includes("sign in")
        ) {
          window.localStorage.removeItem("accessToken");
          window.localStorage.removeItem("refreshToken");
          window.localStorage.removeItem("email");
        }
        setStatus("unauthenticated");
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <main className="matchmaking-shell" style={{ minHeight: "100vh" }}>
        <div className="matchmaking-grid" aria-hidden="true" />
        <div className="matchmaking-art" aria-hidden="true">
          <PhaserSplash />
        </div>
        <div className="matchmaking-shade" aria-hidden="true" />
        
        <div style={{ height: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "16px", zIndex: 10, position: "relative" }}>
          <p className="lobby-eyebrow" style={{ margin: 0 }}>Verifying connection</p>
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
