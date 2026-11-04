"use client";

import { useEffect, useState } from "react";
import { LogIn, MonitorSmartphone, Radio, RotateCcw } from "lucide-react";
import { Modal } from "../ui/modal";
import { Button } from "../ui/button";
import { clearCachedProfile } from "../../libs/profileCache";
import { socketManager } from "../../libs/socket";
import { onSessionReplaced, reportSessionReplaced, type SessionReplacedReason } from "../../libs/session/sessionEvents";
import { createBrowserTabTransport, startTabSession } from "../../libs/session/tabSession";

/** What a replaced tab tells the player. */
export const SESSION_NOTICES: Record<SessionReplacedReason, { badge: string; title: string; message: string; action: string }> = {
  tab: {
    badge: "SESSION PROTOCOL · ACTIVE IN ANOTHER TAB",
    title: "Opened in another tab",
    message: "Chrono Genesis is active in another tab of this browser. Only one tab can play at a time.",
    action: "Use here"
  },
  device: {
    badge: "SESSION PROTOCOL · SIGNED IN ELSEWHERE",
    title: "Signed in on another device",
    message: "Your account has signed in on another device or browser, so this session has ended.",
    action: "Sign in again"
  }
};

const isSignedIn = () => {
  try {
    return Boolean(window.localStorage.getItem("accessToken"));
  } catch {
    return false;
  }
};

/**
 * One place plays at a time. Locks this tab, over every page, when the game is taken over by another tab of this
 * browser (it can take it back) or when a sign-in elsewhere ended this session (it must sign in again).
 */
export function SessionGuard() {
  const [reason, setReason] = useState<SessionReplacedReason>();

  useEffect(() => {
    const tabSession = startTabSession({
      transport: createBrowserTabTransport(),
      tabId: crypto.randomUUID(),
      isSignedIn,
      onReplaced: reportSessionReplaced
    });

    const stopListening = onSessionReplaced((next) => {
      setReason(next);
      // The replaced tab lets go of the match at once, so it cannot act in it any more.
      socketManager.disconnect();
      // The other tabs of this browser share the session that ended.
      if (next === "device") tabSession.announceDeviceReplaced();
    });

    return () => {
      stopListening();
      tabSession.stop();
    };
  }, []);

  if (!reason) return null;
  const notice = SESSION_NOTICES[reason];

  const act = () => {
    if (reason === "tab") {
      // Reloading claims the game for this tab again, which locks the other one.
      window.location.reload();
      return;
    }
    clearCachedProfile();
    window.location.replace("/login");
  };

  return (
    <Modal tone={reason === "device" ? "rose" : "cyan"} shape="rounded" align="center" maxWidth={460} zIndex={20000} labelledBy="session-replaced-title">
      <div className="pending-match-dialog__glow" aria-hidden="true" />
      <div className="pending-match-dialog__grid" aria-hidden="true" />

      <div className="pending-match-dialog__badge">
        <Radio size={13} className="pending-match-pulse-icon" />
        <span>{notice.badge}</span>
      </div>

      <div className="pending-match-dialog__visual" aria-hidden="true">
        <div className="pending-match-dialog__radar-ring" />
        <div className="pending-match-dialog__radar-core">
          <MonitorSmartphone size={26} />
        </div>
      </div>

      <h2 id="session-replaced-title" className="pending-match-dialog__title">{notice.title}</h2>
      <p className="pending-match-dialog__desc" role="alert">{notice.message}</p>

      <div className="pending-match-dialog__actions" style={{ gridTemplateColumns: "1fr" }}>
        <Button
          variant={reason === "device" ? "danger" : "info"}
          fullWidth
          icon={reason === "device" ? <LogIn size={16} /> : <RotateCcw size={16} />}
          onClick={act}
          autoFocus
        >
          {notice.action}
        </Button>
      </div>
    </Modal>
  );
}
