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
  | "sign_out"
  | "tick"
  | "tick_urgent"
  | "turn_you"
  | "turn_enemy"
  | "blade_draw"
  | "gate_lock";

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

        case "tick": {
          // Clock tick of the last ten seconds of a turn.
          const osc = ctx.createOscillator();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(1000, now);

          gainNode.gain.setValueAtTime(effectiveVol * 0.3, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.055);
          break;
        }

        case "tick_urgent": {
          // Sharper, lower-pitched tick for the last five seconds.
          const osc = ctx.createOscillator();
          osc.type = "square";
          osc.frequency.setValueAtTime(760, now);
          osc.frequency.exponentialRampToValueAtTime(520, now + 0.07);

          gainNode.gain.setValueAtTime(effectiveVol * 0.4, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

          osc.connect(gainNode);
          osc.start(now);
          osc.stop(now + 0.085);
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

        case "turn_you": {
          // Your turn: a low note that rises, with two bright notes ringing above it.
          const end = now + 0.6;
          gainNode.gain.setValueAtTime(effectiveVol * 0.5, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, end);
          const low = ctx.createOscillator();
          low.type = "sine";
          low.frequency.setValueAtTime(110, now);
          low.frequency.exponentialRampToValueAtTime(220, now + 0.45);
          low.connect(gainNode);
          low.start(now);
          low.stop(end);
          [
            { freq: 880, delay: 0.05, level: 0.35 },
            { freq: 1320, delay: 0.12, level: 0.22 }
          ].forEach(({ freq, delay, level }) => {
            const bell = ctx.createOscillator();
            const bellGain = ctx.createGain();
            bell.type = "triangle";
            bell.frequency.setValueAtTime(freq, now + delay);
            bellGain.gain.setValueAtTime(level, now + delay);
            bellGain.gain.exponentialRampToValueAtTime(0.001, end);
            bell.connect(bellGain);
            bellGain.connect(gainNode);
            bell.start(now + delay);
            bell.stop(end);
          });
          break;
        }

        case "turn_enemy": {
          // The enemy's turn: a low, dark note that sinks, with two notes a semitone apart gnawing at it.
          const end = now + 0.65;
          gainNode.gain.setValueAtTime(effectiveVol * 0.5, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, end);
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(420, now);
          filter.connect(gainNode);
          const low = ctx.createOscillator();
          low.type = "sawtooth";
          low.frequency.setValueAtTime(82, now);
          low.frequency.exponentialRampToValueAtTime(61, now + 0.5);
          low.connect(filter);
          low.start(now);
          low.stop(end);
          [233, 247].forEach((freq, i) => {
            const clash = ctx.createOscillator();
            const clashGain = ctx.createGain();
            clash.type = "sine";
            clash.frequency.setValueAtTime(freq, now + 0.08);
            clashGain.gain.setValueAtTime(i === 0 ? 0.22 : 0.16, now + 0.08);
            clashGain.gain.exponentialRampToValueAtTime(0.001, end);
            clash.connect(clashGain);
            clashGain.connect(gainNode);
            clash.start(now + 0.08);
            clash.stop(end);
          });
          break;
        }

        case "blade_draw": {
          // A blade drawn: a short, bright rasp that rises and falls away.
          const end = now + 0.22;
          gainNode.gain.setValueAtTime(effectiveVol * 0.35, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, end);
          const filter = ctx.createBiquadFilter();
          filter.type = "highpass";
          filter.frequency.setValueAtTime(1200, now);
          filter.connect(gainNode);
          const rasp = ctx.createOscillator();
          rasp.type = "sawtooth";
          rasp.frequency.setValueAtTime(900, now);
          rasp.frequency.exponentialRampToValueAtTime(2600, now + 0.12);
          rasp.frequency.exponentialRampToValueAtTime(1800, end);
          rasp.connect(filter);
          rasp.start(now);
          rasp.stop(end);
          const ring = ctx.createOscillator();
          const ringGain = ctx.createGain();
          ring.type = "sine";
          ring.frequency.setValueAtTime(3200, now + 0.05);
          ringGain.gain.setValueAtTime(0.18, now + 0.05);
          ringGain.gain.exponentialRampToValueAtTime(0.001, end);
          ring.connect(ringGain);
          ringGain.connect(gainNode);
          ring.start(now + 0.05);
          ring.stop(end);
          break;
        }

        case "gate_lock": {
          // A gate locked: a low thud, then a short bright latch.
          const end = now + 0.3;
          gainNode.gain.setValueAtTime(effectiveVol * 0.5, now);
          gainNode.gain.exponentialRampToValueAtTime(0.001, end);
          const thud = ctx.createOscillator();
          thud.type = "sine";
          thud.frequency.setValueAtTime(140, now);
          thud.frequency.exponentialRampToValueAtTime(55, now + 0.22);
          thud.connect(gainNode);
          thud.start(now);
          thud.stop(end);
          const latch = ctx.createOscillator();
          const latchGain = ctx.createGain();
          latch.type = "square";
          latch.frequency.setValueAtTime(1800, now + 0.04);
          latchGain.gain.setValueAtTime(0.12, now + 0.04);
          latchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
          latch.connect(latchGain);
          latchGain.connect(gainNode);
          latch.start(now + 0.04);
          latch.stop(now + 0.11);
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
