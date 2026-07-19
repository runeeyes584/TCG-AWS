"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useLoopingAudio(src: string, volume = 0.35) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || audio.muted) return;
    void audio.play().catch(() => undefined);
  }, []);

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = volume;
    audioRef.current = audio;

    play();
    window.addEventListener("pointerdown", play, { once: true });
    window.addEventListener("keydown", play, { once: true });

    return () => {
      window.removeEventListener("pointerdown", play);
      window.removeEventListener("keydown", play);
      audio.pause();
      audio.currentTime = 0;
      audioRef.current = null;
    };
  }, [play, src, volume]);

  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.muted = muted;
    if (!muted) play();
  }, [muted, play]);

  return { muted, toggleMuted: () => setMuted((current) => !current) };
}
