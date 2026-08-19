"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, ShieldAlert, X } from "lucide-react";

export interface AfkToastNotificationProps {
  level: "warning" | "danger";
  message: string;
  duration?: number;
  onClose: () => void;
}

export function AfkToastNotification({
  level,
  message,
  duration = 8000,
  onClose,
}: AfkToastNotificationProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(duration / 1000));
  const isDanger = level === "danger";
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, Math.ceil((duration - elapsed) / 1000));
      setRemainingSeconds(left);
    }, 200);

    const timer = setTimeout(() => {
      onCloseRef.current();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration]);

  return (
    <motion.div
      className="afk-toast-portal"
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: 100,
        scale: 0.92,
        transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] }
      }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 26,
      }}
      role="alert"
      aria-live="assertive"
    >
      <div className={`afk-toast-card afk-toast-card--${level}`}>
        {/* Background Cyber Art Grid and Ambient Shard Particles */}
        <div className="afk-toast-bg" aria-hidden="true" />
        <div className="afk-toast-shards" aria-hidden="true">
          <span className="afk-shard afk-shard--1" />
          <span className="afk-shard afk-shard--2" />
          <span className="afk-shard afk-shard--3" />
        </div>

        {/* Top Header Tag */}
        <div className="afk-toast-header">
          <div className="afk-toast-badge">
            {isDanger ? (
              <ShieldAlert size={14} className="afk-toast-badge__icon" />
            ) : (
              <AlertTriangle size={14} className="afk-toast-badge__icon" />
            )}
            <span>{isDanger ? "SECURITY PROTOCOL · AFK VIOLATION" : "SYSTEM WARNING · TIMEOUT ALERT"}</span>
          </div>

          <div className="afk-toast-timer-badge">
            <Clock size={12} />
            <span>{remainingSeconds}s</span>
          </div>

          <button
            type="button"
            className="afk-toast-close"
            onClick={onClose}
            aria-label="Close AFK notification"
          >
            <X size={15} />
          </button>
        </div>

        {/* Main Content Message */}
        <div className="afk-toast-body">
          <div className="afk-toast-icon-frame">
            {isDanger ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div className="afk-toast-text">
            <h4 className="afk-toast-title">
              {isDanger ? "SURRENDER IMMINENT" : "TURN MISSED"}
            </h4>
            <p className="afk-toast-message">{message}</p>
          </div>
        </div>

        {/* 8-Second Animated Progress Bar */}
        <div className="afk-toast-progress-track" aria-hidden="true">
          <motion.div
            className={`afk-toast-progress-bar afk-toast-progress-bar--${level}`}
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: duration / 1000, ease: "linear" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
