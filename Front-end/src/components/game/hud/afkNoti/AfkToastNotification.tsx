"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { NoticeCard } from "../../../ui/feedback";
import styles from "./AfkToastNotification.module.css";

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
      className={styles.portal}
      initial={{ opacity: 0, x: 80, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: 100,
        scale: 0.92,
        transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
      }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 26,
      }}
      role="alert"
      aria-live="assertive"
    >
      <NoticeCard
        tone={level}
        badge={isDanger ? "SECURITY PROTOCOL · AFK VIOLATION" : "SYSTEM WARNING · TIMEOUT ALERT"}
        title={isDanger ? "SURRENDER IMMINENT" : "TURN MISSED"}
        timerSeconds={remainingSeconds}
        progressDuration={duration}
        onClose={onClose}
        closeLabel="Close AFK notification"
      >
        {message}
      </NoticeCard>
    </motion.div>
  );
}
