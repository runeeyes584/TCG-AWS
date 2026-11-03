"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { NoticeCard } from "./NoticeCard";
import type { ToastItem, ToastPlacement } from "./toastQueue";
import styles from "./Toast.module.css";

export interface ToastProps {
  toast: ToastItem;
  onClose: (key: string) => void;
}

/** How a toast comes and goes: from the right at the match table, from above everywhere else. */
const MOTION: Record<ToastPlacement, { from: { x?: number; y?: number }; to: { x?: number; y?: number } }> = {
  game: { from: { x: 80 }, to: { x: 100 } },
  page: { from: { y: -40 }, to: { y: -40 } },
};

export function Toast({ toast, onClose }: ToastProps) {
  const { key, revision, tone, badge, title, message, duration, placement } = toast;
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(duration / 1000));
  const onCloseRef = useRef(onClose);
  const urgent = tone === "danger" || tone === "warning";
  const { from, to } = MOTION[placement];

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // A toast shown again (a new revision) starts its countdown over.
  useEffect(() => {
    setRemainingSeconds(Math.ceil(duration / 1000));
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRemainingSeconds(Math.max(0, Math.ceil((duration - elapsed) / 1000)));
    }, 200);
    const timer = setTimeout(() => onCloseRef.current(key), duration);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [duration, key, revision]);

  return (
    <motion.div
      layout="position"
      className={styles.toast}
      initial={{ opacity: 0, scale: 0.95, ...from }}
      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
      exit={{
        opacity: 0,
        scale: 0.92,
        ...to,
        transition: { duration: 0.35, ease: [0.25, 1, 0.5, 1] },
      }}
      transition={{ type: "spring", stiffness: 350, damping: 26 }}
      role={urgent ? "alert" : "status"}
      aria-live={urgent ? "assertive" : "polite"}
    >
      {/* Keyed by revision so the progress bar starts over with the countdown. */}
      <NoticeCard
        key={revision}
        tone={tone}
        badge={badge}
        title={title}
        timerSeconds={remainingSeconds}
        progressDuration={duration}
        onClose={() => onClose(key)}
        closeLabel={`Close notification: ${title}`}
      >
        {message}
      </NoticeCard>
    </motion.div>
  );
}
