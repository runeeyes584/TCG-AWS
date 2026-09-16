"use client";

export interface AudioSettings {
  masterVolume: number; // 0 - 100
  musicVolume: number; // 0 - 100
  effectsVolume: number; // 0 - 100
  masterMuted: boolean;
  musicMuted: boolean;
  effectsMuted: boolean;
}

export type SfxType =
  | "click"
  | "hover"
  | "tab"
  | "modal_open"
  | "modal_close"
  | "slider_tick"
  | "warning"
  | "success"
  | "sign_out";

const STORAGE_KEY = "chrono_audio_settings_v1";

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 80,
  musicVolume: 70,
  effectsVolume: 80,
  masterMuted: false,
  musicMuted: false,
  effectsMuted: false,
};

type SettingsListener = (settings: AudioSettings) => void;

class AudioManager {
  private settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private listeners: Set<SettingsListener> = new Set();

  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmTrack: string | null = null;
  private bgmFadeInterval: number | null = null;

  private audioCtx: AudioContext | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.loadSettings();
      this.initUnlockListeners();
    }
  }

  private loadSettings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.settings = {
          masterVolume: typeof parsed.masterVolume === "number" ? Math.max(0, Math.min(100, parsed.masterVolume)) : DEFAULT_SETTINGS.masterVolume,
          musicVolume: typeof parsed.musicVolume === "number" ? Math.max(0, Math.min(100, parsed.musicVolume)) : DEFAULT_SETTINGS.musicVolume,
          effectsVolume: typeof parsed.effectsVolume === "number" ? Math.max(0, Math.min(100, parsed.effectsVolume)) : DEFAULT_SETTINGS.effectsVolume,
          masterMuted: Boolean(parsed.masterMuted),
          musicMuted: Boolean(parsed.musicMuted),
          effectsMuted: Boolean(parsed.effectsMuted),
        };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage write errors in private browsing
    }
  }

  private notifyListeners(): void {
    const copy = { ...this.settings };
    this.listeners.forEach((listener) => listener(copy));
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.settings });
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public getEffectiveMusicVolume(): number {
    if (this.settings.masterMuted || this.settings.musicMuted) return 0;
    return (this.settings.masterVolume / 100) * (this.settings.musicVolume / 100);
  }

  public getEffectiveEffectsVolume(): number {
    if (this.settings.masterMuted || this.settings.effectsMuted) return 0;
    return (this.settings.masterVolume / 100) * (this.settings.effectsVolume / 100);
  }

  public setMasterVolume(val: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(100, Math.round(val)));
    this.applyMusicVolume();
    this.saveSettings();
    this.notifyListeners();
  }

  public setMusicVolume(val: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(100, Math.round(val)));
    this.applyMusicVolume();
    this.saveSettings();
    this.notifyListeners();
  }

  public setEffectsVolume(val: number): void {
    this.settings.effectsVolume = Math.max(0, Math.min(100, Math.round(val)));
    this.saveSettings();
    this.notifyListeners();
  }

  public toggleMasterMute(): void {
    this.settings.masterMuted = !this.settings.masterMuted;
    this.applyMusicVolume();
    this.saveSettings();
    this.notifyListeners();
  }

  public toggleMusicMute(): void {
    this.settings.musicMuted = !this.settings.musicMuted;
    this.applyMusicVolume();
    this.saveSettings();
    this.notifyListeners();
  }

  public toggleEffectsMute(): void {
    this.settings.effectsMuted = !this.settings.effectsMuted;
    this.saveSettings();
    this.notifyListeners();
  }

  private applyMusicVolume(): void {
    if (this.bgmAudio) {
      const vol = this.getEffectiveMusicVolume();
      this.bgmAudio.volume = Math.max(0, Math.min(1, vol));
    }
  }

  private initUnlockListeners(): void {
    const unlock = () => {
      this.isUnlocked = true;
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        void this.audioCtx.resume();
      }
      if (this.bgmAudio && this.bgmAudio.paused && this.currentBgmTrack && this.getEffectiveMusicVolume() > 0) {
        void this.bgmAudio.play().catch(() => undefined);
      }
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      void this.audioCtx.resume().catch(() => undefined);
    }
    return this.audioCtx;
  }

  /**
   * Play BGM with smooth crossfade and auto volume adjustment
   */
  public playBgm(trackUrl: string, loop = true): void {
    if (typeof window === "undefined") return;

    if (this.currentBgmTrack === trackUrl && this.bgmAudio && !this.bgmAudio.paused) {
      this.applyMusicVolume();
      return;
    }

    if (this.bgmFadeInterval !== null) {
      window.clearInterval(this.bgmFadeInterval);
      this.bgmFadeInterval = null;
    }

    const previousAudio = this.bgmAudio;
    this.currentBgmTrack = trackUrl;

    const newAudio = new Audio(trackUrl);
    newAudio.loop = loop;
    newAudio.preload = "metadata";
    newAudio.volume = this.getEffectiveMusicVolume();
    this.bgmAudio = newAudio;

    if (previousAudio) {
      // Fade out previous audio
      let currentVol = previousAudio.volume;
      const fadeStep = 0.08;
      const fadeTimer = window.setInterval(() => {
        currentVol = Math.max(0, currentVol - fadeStep);
        previousAudio.volume = currentVol;
        if (currentVol <= 0) {
          window.clearInterval(fadeTimer);
          previousAudio.pause();
          previousAudio.currentTime = 0;
          previousAudio.src = "";
        }
      }, 50);
    }

    const startPlay = () => {
      newAudio.volume = this.getEffectiveMusicVolume();
      void newAudio.play().catch(() => {
        // Autoplay policy prevented playback, will retry on next user gesture
      });
    };

    startPlay();
  }

  public stopBgm(): void {
    if (this.bgmFadeInterval !== null) {
      window.clearInterval(this.bgmFadeInterval);
      this.bgmFadeInterval = null;
    }

    if (this.bgmAudio) {
      const audio = this.bgmAudio;
      this.bgmAudio = null;
      this.currentBgmTrack = null;

      let currentVol = audio.volume;
      const fadeStep = 0.1;
      this.bgmFadeInterval = window.setInterval(() => {
        currentVol = Math.max(0, currentVol - fadeStep);
        audio.volume = currentVol;
        if (currentVol <= 0) {
          if (this.bgmFadeInterval !== null) {
            window.clearInterval(this.bgmFadeInterval);
            this.bgmFadeInterval = null;
          }
          audio.pause();
          audio.currentTime = 0;
          audio.src = "";
        }
      }, 40);
    }
  }

  public getCurrentTrack(): string | null {
    return this.currentBgmTrack;
  }

  /**
   * Play high-precision low-latency SFX via Web Audio synthesis or audio file
   */
  public playSfx(typeOrUrl: SfxType | string, volumeScale = 1.0): void {
    const effectiveVol = this.getEffectiveEffectsVolume() * volumeScale;
    if (effectiveVol <= 0.001) return;

    // Check if it's an audio file URL
    if (typeOrUrl.startsWith("/") || typeOrUrl.startsWith("http")) {
      const audio = new Audio(typeOrUrl);
      audio.volume = Math.max(0, Math.min(1, effectiveVol));
      void audio.play().catch(() => undefined);
      return;
    }

    // High-tech Cyberpunk Web Audio Sound Synthesizer
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(effectiveVol * 0.4, now);
      gainNode.connect(ctx.destination);

      switch (typeOrUrl as SfxType) {
        case "click": {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);

          gainNode.gain.setValueAtTime(effectiveVol * 0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.045);
          break;
        }

        case "hover": {
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);

          gainNode.gain.setValueAtTime(effectiveVol * 0.15, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.035);
          break;
        }

        case "tab":
        case "slider_tick": {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(980, now);
          osc.frequency.exponentialRampToValueAtTime(650, now + 0.05);

          gainNode.gain.setValueAtTime(effectiveVol * 0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.055);
          break;
        }

        case "modal_open": {
          // Cyber Uplink Whoosh / Hologram reveal chord
          const osc1 = ctx.createOscillator();
          const osc2 = ctx.createOscillator();
          osc1.type = "sine";
          osc2.type = "sawtooth";

          osc1.frequency.setValueAtTime(320, now);
          osc1.frequency.exponentialRampToValueAtTime(960, now + 0.14);

          osc2.frequency.setValueAtTime(640, now);
          osc2.frequency.exponentialRampToValueAtTime(1280, now + 0.14);

          gainNode.gain.setValueAtTime(0.001, now);
          gainNode.gain.linearRampToValueAtTime(effectiveVol * 0.35, now + 0.03);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          osc1.connect(gainNode);
          osc2.connect(gainNode);
          osc1.start(now);
          osc2.start(now);
          osc1.stop(now + 0.16);
          osc2.stop(now + 0.16);
          break;
        }

        case "modal_close": {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(850, now);
          osc.frequency.exponentialRampToValueAtTime(280, now + 0.09);

          gainNode.gain.setValueAtTime(effectiveVol * 0.25, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.1);
          break;
        }

        case "warning":
        case "sign_out": {
          // Security Alert two-tone chime
          const osc = ctx.createOscillator();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.setValueAtTime(420, now + 0.08);

          gainNode.gain.setValueAtTime(effectiveVol * 0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.22);
          break;
        }

        case "success": {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(587.33, now); // D5
          osc.frequency.setValueAtTime(880, now + 0.08); // A5

          gainNode.gain.setValueAtTime(effectiveVol * 0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.27);
          break;
        }

        default: {
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(600, now);
          gainNode.gain.setValueAtTime(effectiveVol * 0.2, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.055);
          break;
        }
      }
    } catch {
      // Ignore audio synthesis errors gracefully
    }
  }
}

export const audioManager = new AudioManager();
