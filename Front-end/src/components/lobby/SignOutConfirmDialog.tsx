"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { LogOut, ShieldAlert, ArrowLeft, AlertTriangle } from "lucide-react";
import { useGlobalAudio } from "../../contexts/AudioContext";

interface SignOutConfirmDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
}

export function SignOutConfirmDialog({
  isOpen,
  onCancel,
  onConfirm,
  isSubmitting = false,
}: SignOutConfirmDialogProps) {
  const { playSfx } = useGlobalAudio();

  useEffect(() => {
    if (isOpen) {
      playSfx("warning");
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !isSubmitting) {
          playSfx("click");
          onCancel();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onCancel, playSfx, isSubmitting]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="signout-dialog-title"
        onClick={() => {
          if (!isSubmitting) {
            playSfx("click");
            onCancel();
          }
        }}
      >
        {/* Modal Section - Strict 90-degree square corners */}
        <section
          className="relative w-[92vw] max-w-md rounded-none border-2 border-rose-500/50 bg-[#0d070b]/98 p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] backdrop-blur-2xl text-slate-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Holographic 90-degree Sharp Corner Brackets */}
          <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-rose-400 pointer-events-none" />
          <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-rose-400 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-rose-400 pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-rose-400 pointer-events-none" />

          {/* Ambient Top Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#f43f5e]" />

          {/* Security Header Badge - Sharp 90-degree Square HUD */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-none bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-mono font-bold tracking-wider mb-4 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <ShieldAlert size={14} className="animate-pulse text-rose-400" />
            <span>SECURITY PROTOCOL // TERMINATION</span>
          </div>

          {/* Icon & Message */}
          <div className="flex flex-col items-center text-center my-3">
            {/* Square Tactical Radar Icon Frame */}
            <div className="relative mb-4 flex items-center justify-center w-16 h-16 rounded-none bg-rose-950/50 border-2 border-rose-500/60 shadow-[0_0_30px_rgba(244,63,94,0.35)]">
              <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-rose-300" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-rose-300" />
              <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-rose-300" />
              <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-rose-300" />
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            </div>

            <h2
              id="signout-dialog-title"
              className="text-xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-rose-200 via-rose-300 to-amber-200 mb-2 uppercase tracking-wide"
            >
              TERMINATE ACTIVE SESSION?
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-xs font-sans">
              Signing out will disconnect your neural link, forfeit any active matchmaking queue, and return to the Chrono Genesis gate.
            </p>
          </div>

          {/* Action Buttons - Tactical Phaser 4.2.1 Synchronized Square Buttons */}
          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-none border border-slate-600 bg-slate-900/90 hover:bg-slate-800 hover:border-cyan-400 hover:text-cyan-200 text-slate-200 text-xs font-bold tracking-widest uppercase transition-all active:scale-95 shadow-[0_0_10px_rgba(0,0,0,0.5)]"
              onClick={() => {
                playSfx("click");
                onCancel();
              }}
              disabled={isSubmitting}
            >
              <ArrowLeft size={15} />
              <span>STAY IN LOBBY</span>
            </button>
            <button
              type="button"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-none border-2 border-rose-500 bg-gradient-to-r from-rose-800 via-rose-700 to-red-600 hover:from-rose-700 hover:to-red-500 text-white text-xs font-bold tracking-widest uppercase shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all active:scale-95 disabled:opacity-50"
              onClick={() => {
                playSfx("sign_out");
                onConfirm();
              }}
              disabled={isSubmitting}
            >
              <LogOut size={15} />
              <span>{isSubmitting ? "DISCONNECTING..." : "SIGN OUT"}</span>
            </button>
          </div>
        </section>
      </div>
    </ModalPortal>
  );
}

function ModalPortal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? createPortal(children, document.body) : null;
}
