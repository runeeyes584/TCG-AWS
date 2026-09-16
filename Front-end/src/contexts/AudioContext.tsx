"use client";

import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { audioManager, AudioSettings, SfxType } from "../libs/audioManager";

interface GlobalAudioContextValue {
  settings: AudioSettings;
  effectiveMusicVolume: number;
  effectiveEffectsVolume: number;
  currentTrack: string | null;
  setMasterVolume: (val: number) => void;
  setMusicVolume: (val: number) => void;
  setEffectsVolume: (val: number) => void;
  toggleMasterMute: () => void;
  toggleMusicMute: () => void;
  toggleEffectsMute: () => void;
  playBgm: (trackUrl: string, loop?: boolean) => void;
  stopBgm: () => void;
  playSfx: (typeOrUrl: SfxType | string, volumeScale?: number) => void;
}

const AudioContext = createContext<GlobalAudioContextValue | null>(null);

export const GlobalAudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AudioSettings>(() => audioManager.getSettings());
  const [currentTrack, setCurrentTrack] = useState<string | null>(() => audioManager.getCurrentTrack());

  useEffect(() => {
    const unsubscribe = audioManager.subscribe((newSettings: AudioSettings) => {
      setSettings(newSettings);
      setCurrentTrack(audioManager.getCurrentTrack());
    });


    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<GlobalAudioContextValue>(() => {
    return {
      settings,
      effectiveMusicVolume: audioManager.getEffectiveMusicVolume(),
      effectiveEffectsVolume: audioManager.getEffectiveEffectsVolume(),
      currentTrack,
      setMasterVolume: (val: number) => audioManager.setMasterVolume(val),
      setMusicVolume: (val: number) => audioManager.setMusicVolume(val),
      setEffectsVolume: (val: number) => audioManager.setEffectsVolume(val),
      toggleMasterMute: () => audioManager.toggleMasterMute(),
      toggleMusicMute: () => audioManager.toggleMusicMute(),
      toggleEffectsMute: () => audioManager.toggleEffectsMute(),
      playBgm: (trackUrl: string, loop = true) => {
        audioManager.playBgm(trackUrl, loop);
        setCurrentTrack(audioManager.getCurrentTrack());
      },
      stopBgm: () => {
        audioManager.stopBgm();
        setCurrentTrack(null);
      },
      playSfx: (typeOrUrl: SfxType | string, volumeScale = 1.0) => {
        audioManager.playSfx(typeOrUrl, volumeScale);
      },
    };
  }, [settings, currentTrack]);

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};

export const useGlobalAudio = (): GlobalAudioContextValue => {
  const context = useContext(AudioContext);
  if (!context) {
    // Fallback directly to audioManager if outside provider (ensures safe usage anywhere)
    return {
      settings: audioManager.getSettings(),
      effectiveMusicVolume: audioManager.getEffectiveMusicVolume(),
      effectiveEffectsVolume: audioManager.getEffectiveEffectsVolume(),
      currentTrack: audioManager.getCurrentTrack(),
      setMasterVolume: (val: number) => audioManager.setMasterVolume(val),
      setMusicVolume: (val: number) => audioManager.setMusicVolume(val),
      setEffectsVolume: (val: number) => audioManager.setEffectsVolume(val),
      toggleMasterMute: () => audioManager.toggleMasterMute(),
      toggleMusicMute: () => audioManager.toggleMusicMute(),
      toggleEffectsMute: () => audioManager.toggleEffectsMute(),
      playBgm: (trackUrl: string, loop = true) => audioManager.playBgm(trackUrl, loop),
      stopBgm: () => audioManager.stopBgm(),
      playSfx: (typeOrUrl: SfxType | string, volumeScale = 1.0) => audioManager.playSfx(typeOrUrl, volumeScale),
    };
  }
  return context;
};
