"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useLoopingAudio(src: string, volume = 0.35, enabled = true) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(enabled);
  const userInteractedRef = useRef(false);
  const [muted, setMuted] = useState(false);
  enabledRef.current = enabled;

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.muted || !enabledRef.current) return;
    void audio.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    // Keep music off the critical rendering path. The first user gesture
    // triggers loading and also satisfies browser autoplay requirements.
    audio.preload = "none";
    audio.volume = volume;
    audioRef.current = audio;

    const handleUserGesture = () => {
      userInteractedRef.current = true;
      play();
    };

    window.addEventListener("pointerdown", handleUserGesture, { once: true });
    window.addEventListener("keydown", handleUserGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", handleUserGesture);
      window.removeEventListener("keydown", handleUserGesture);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [play, src, volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
    if (!enabled) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      return;
    }
    if (!muted && userInteractedRef.current) play();
  }, [enabled, muted, play]);

  return { muted, toggleMuted: () => setMuted((current) => !current) };
}
