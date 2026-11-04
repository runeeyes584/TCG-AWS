"use client";

import { useEffect, useRef, useCallback, memo } from "react";
import {
  BookOpen,
  FlaskConical,
  Hash,
  History,
  Layers3,
  Swords,
  Trophy,
} from "lucide-react";
import { useGlobalAudio } from "../../contexts/AudioContext";

export type LobbyTab =
  | "duel"
  | "deck"
  | "collection"
  | "custom"
  | "trial"
  | "rank global"
  | "history";

export interface CompassTabItem {
  id: LobbyTab;
  label: string;
  icon: typeof Swords;
  subtext: string;
  badge: string;
}

export const COMPASS_TABS: CompassTabItem[] = [
  { id: "deck", label: "DECK", icon: Layers3, subtext: "INACTIVE", badge: "ARSENAL" },
  { id: "collection", label: "COLLECTION", icon: BookOpen, subtext: "INACTIVE", badge: "ARCHIVE" },
  { id: "duel", label: "DUEL", icon: Swords, subtext: "RANKED ARENA", badge: "PRISM VANGUARD" },
  { id: "custom", label: "CUSTOM MATCH", icon: Hash, subtext: "INACTIVE", badge: "PRIVATE DUEL" },
  { id: "trial", label: "TRIAL", icon: FlaskConical, subtext: "INACTIVE", badge: "SOLO SANDBOX" },
  { id: "rank global", label: "RANK", icon: Trophy, subtext: "INACTIVE", badge: "GLOBAL CIRCUIT" },
  { id: "history", label: "HISTORY", icon: History, subtext: "INACTIVE", badge: "COMBAT LOGS" },
];

interface ChronoCommandCompassProps {
  activeTab: LobbyTab;
  onSelectTab: (tab: LobbyTab) => void;
  onConfirmTab: (tab: LobbyTab) => void;
}

// Helpers & Precomputed Geometry for Deterministic SSR / Client Hydration
const round2 = (val: number): number => Math.round(val * 100) / 100;

// Expanded Inner Arc Geometry: Arc apex at X = -155 + 260 = 105px
const ARC_RADIUS = 260;
const ARC_CENTER_X = -155;
const STEP_ANGLE_DEG = 14;

// Expanded Outer Contour Item Track: Items follow outer rim at X = -155 + 310 = 155px at apex
const ITEM_RADIUS = 310;
const ITEM_CENTER_X = -155;

// Precomputed static SVG coordinates (deterministic across Node SSR & Browser Client)
const RUNE_R = ARC_RADIUS - 16;
const RUNE_START_X = round2(ARC_CENTER_X + RUNE_R * Math.cos(-1.1));
const RUNE_START_Y = round2(RUNE_R * Math.sin(-1.1));
const RUNE_END_X = round2(ARC_CENTER_X + RUNE_R * Math.cos(1.1));
const RUNE_END_Y = round2(RUNE_R * Math.sin(1.1));
const RUNE_ARC_PATH_D = `M ${RUNE_START_X} ${RUNE_START_Y} A ${RUNE_R} ${RUNE_R} 0 0 1 ${RUNE_END_X} ${RUNE_END_Y}`;

const CELESTIAL_TICKS = [-42, -35, -28, -21, -14, -7, 0, 7, 14, 21, 28, 35, 42].map((deg) => {
  const rad = (deg * Math.PI) / 180;
  const isApex = deg === 0;
  const r1 = ARC_RADIUS + (isApex ? 12 : 6);
  const r2 = ARC_RADIUS - (isApex ? 12 : 6);
  return {
    deg,
    x1: round2(ARC_CENTER_X + r1 * Math.cos(rad)),
    y1: round2(r1 * Math.sin(rad)),
    x2: round2(ARC_CENTER_X + r2 * Math.cos(rad)),
    y2: round2(r2 * Math.sin(rad)),
    isApex,
  };
});

const STARDUST_PARTICLES = [
  {
    key: "stardust-1",
    cx: round2(ARC_CENTER_X + ARC_RADIUS * Math.cos(-0.45)),
    cy: round2(ARC_RADIUS * Math.sin(-0.45)),
    r: 2.5,
    fill: "#53e6ff",
    filter: "url(#dial-cyan-glow)",
  },
  {
    key: "stardust-2",
    cx: round2(ARC_CENTER_X + (ARC_RADIUS + 10) * Math.cos(-0.22)),
    cy: round2((ARC_RADIUS + 10) * Math.sin(-0.22)),
    r: 1.8,
    fill: "#f4faff",
  },
  {
    key: "stardust-3",
    cx: round2(ARC_CENTER_X + (ARC_RADIUS - 8) * Math.cos(0.22)),
    cy: round2((ARC_RADIUS - 8) * Math.sin(0.22)),
    r: 2,
    fill: "#8c5cff",
    filter: "url(#dial-violet-bloom)",
  },
  {
    key: "stardust-4",
    cx: round2(ARC_CENTER_X + ARC_RADIUS * Math.cos(0.45)),
    cy: round2(ARC_RADIUS * Math.sin(0.45)),
    r: 2.5,
    fill: "#53e6ff",
    filter: "url(#dial-cyan-glow)",
  },
];

export const ChronoCommandCompass = memo(function ChronoCommandCompass({
  activeTab,
  onSelectTab,
  onConfirmTab,
}: ChronoCommandCompassProps) {
  const { playSfx } = useGlobalAudio();
  const compassContainerRef = useRef<HTMLDivElement>(null);
  const lastWheelTimeRef = useRef<number>(0);

  const activeIndex = COMPASS_TABS.findIndex((t) => t.id === activeTab);
  const safeActiveIndex = activeIndex >= 0 ? activeIndex : 2; // Default to 'duel'

  // Dynamic dial rotation: only the celestial disc rotates around (CENTER_X, 0)
  const dialRotationDeg = round2((safeActiveIndex - 2) * -STEP_ANGLE_DEG * 0.75);

  // Mouse wheel scroll handler
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Don't intercept if scrolling inside a modal or dropdown
      const target = e.target as HTMLElement | null;
      if (target?.closest(".lobby-dropdown-menu, .sound-modal, .dialog-overlay")) {
        return;
      }

      const now = performance.now();
      if (now - lastWheelTimeRef.current < 160) {
        return;
      }

      // Check minimum wheel threshold to avoid trackpad jitter
      if (Math.abs(e.deltaY) < 18) {
        return;
      }

      e.preventDefault();
      lastWheelTimeRef.current = now;

      const direction = e.deltaY > 0 ? 1 : -1;
      const nextIndex =
        (safeActiveIndex + direction + COMPASS_TABS.length) % COMPASS_TABS.length;

      playSfx("tab");
      onSelectTab(COMPASS_TABS[nextIndex].id);
    },
    [safeActiveIndex, onSelectTab, playSfx]
  );

  // Attach global wheel listener to window
  useEffect(() => {
    const handleWindowWheel = (e: WheelEvent) => {
      handleWheel(e);
    };

    window.addEventListener("wheel", handleWindowWheel, { passive: false });
    return () => {
      window.removeEventListener("wheel", handleWindowWheel);
    };
  }, [handleWheel]);

  // Global window keyboard navigation listener (ArrowUp, ArrowDown, W, S, Enter, Space)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      if (document.querySelector(".lobby-dropdown-menu, .sound-modal, .dialog-overlay")) {
        return;
      }

      if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") {
        e.preventDefault();
        const prevIndex =
          (safeActiveIndex - 1 + COMPASS_TABS.length) % COMPASS_TABS.length;
        playSfx("tab");
        onSelectTab(COMPASS_TABS[prevIndex].id);
      } else if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") {
        e.preventDefault();
        const nextIndex = (safeActiveIndex + 1) % COMPASS_TABS.length;
        playSfx("tab");
        onSelectTab(COMPASS_TABS[nextIndex].id);
      } else if (e.key === "Enter" || e.key === " ") {
        if (activeEl?.tagName !== "BUTTON") {
          e.preventDefault();
          playSfx("click");
          onConfirmTab(activeTab);
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [safeActiveIndex, activeTab, onSelectTab, onConfirmTab, playSfx]);

  // Fallback keyboard navigation on container
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const direction =
        e.key === "ArrowDown" || e.key.toLowerCase() === "s"
          ? 1
          : e.key === "ArrowUp" || e.key.toLowerCase() === "w"
          ? -1
          : 0;

      if (direction !== 0) {
        e.preventDefault();
        const nextIndex =
          (safeActiveIndex + direction + COMPASS_TABS.length) % COMPASS_TABS.length;
        playSfx("tab");
        onSelectTab(COMPASS_TABS[nextIndex].id);
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        playSfx("click");
        onConfirmTab(activeTab);
      }
    },
    [safeActiveIndex, activeTab, onSelectTab, onConfirmTab, playSfx]
  );

  return (
    <div
      ref={compassContainerRef}
      className="chrono-compass"
      tabIndex={0}
      role="region"
      aria-label="Chrono Command Compass Navigation"
      onKeyDown={handleKeyDown}
    >
      {/* Stationary Minimalist Arrow Pointer (Straddles center apex of the compass arc) */}
      <div className="chrono-compass__cyber-needle" aria-hidden="true">
        <div className="chrono-compass__needle-arrow" />
      </div>

      {/* Visual Runic Dial & Orbital Rings SVG (Container stays stationary, rotary group rotates) */}
      <div className="chrono-compass__dial" aria-hidden="true">
        <svg
          className="chrono-compass__svg"
          viewBox="0 -450 750 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          suppressHydrationWarning
        >
          <defs>
            {/* Cyan glow filter */}
            <filter id="dial-cyan-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feGaussianBlur stdDeviation="16" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Violet bloom filter */}
            <filter id="dial-violet-bloom" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="14" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Linear gradients for arcs */}
            <linearGradient id="arc-energy-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#53e6ff" stopOpacity="0.1" />
              <stop offset="35%" stopColor="#53e6ff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#f4faff" stopOpacity="1" />
              <stop offset="65%" stopColor="#53e6ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8c5cff" stopOpacity="0.15" />
            </linearGradient>

            <linearGradient id="stone-band-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#141c2c" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#1f2c42" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0d1422" stopOpacity="0.5" />
            </linearGradient>

            <linearGradient id="pulse-trail-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#53e6ff" stopOpacity="0" />
              <stop offset="50%" stopColor="#53e6ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8c5cff" stopOpacity="0" />
            </linearGradient>

            {/* Electric plasma spark gradient */}
            <linearGradient id="electric-spark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#53e6ff" stopOpacity="0" />
              <stop offset="30%" stopColor="#53e6ff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="70%" stopColor="#53e6ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#8c5cff" stopOpacity="0" />
            </linearGradient>

            {/* Stationary right-fade mask: ensures celestial dial and runes smoothly fade out before outer item region */}
            <linearGradient id="dial-fade-gradient" x1="98" y1="0" x2="140" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
              <stop offset="70%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </linearGradient>
            <mask id="chrono-dial-fade-mask" maskUnits="userSpaceOnUse" x="-250" y="-500" width="500" height="1000">
              <rect x="-250" y="-500" width="500" height="1000" fill="url(#dial-fade-gradient)" />
            </mask>
          </defs>

          {/* Rotary Group wrapped in stationary right-fade mask */}
          <g mask="url(#chrono-dial-fade-mask)">
            <g
              className="chrono-compass__rotary-group"
              transform={`rotate(${dialRotationDeg}, ${ARC_CENTER_X}, 0)`}
            >
            {/* 1. Deep outer celestial guide arc */}
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS + 24}
              stroke="#4a7dff"
              strokeWidth="1"
              strokeOpacity="0.18"
              strokeDasharray="4 8"
            />

            {/* 2. Stone runic band with carved cuneiform glyphs */}
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS - 16}
              stroke="url(#stone-band-grad)"
              strokeWidth="22"
              strokeOpacity="0.85"
            />
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS - 27}
              stroke="#53e6ff"
              strokeWidth="1"
              strokeOpacity="0.25"
            />
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS - 2}
              stroke="#53e6ff"
              strokeWidth="1"
              strokeOpacity="0.3"
            />

            {/* Engraved runic symbols text along curved arc */}
            <path
              id="rune-arc-path"
              d={RUNE_ARC_PATH_D}
              fill="none"
            />
            <text className="chrono-compass__runes" fill="rgba(148, 185, 222, 0.42)">
              <textPath href="#rune-arc-path" startOffset="5%">
                ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛋ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᚺ ᚾ ᛁ ᛃ
              </textPath>
            </text>

            {/* 3. Primary energetic Cyan arc */}
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS}
              stroke="url(#arc-energy-grad)"
              strokeWidth="2.5"
              filter="url(#dial-cyan-glow)"
            />

            {/* 3b. Cyber Plasma Electric Surge along the arc */}
            <circle
              className="chrono-compass__electric-surge"
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS}
              stroke="url(#electric-spark-grad)"
              strokeWidth="2.5"
              strokeDasharray="24 160"
              filter="url(#dial-cyan-glow)"
            />

            {/* 4. Concentric inner fine arc */}
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS - 34}
              stroke="#8c5cff"
              strokeWidth="1.2"
              strokeOpacity="0.32"
              strokeDasharray="2 6"
            />
            <circle
              cx={ARC_CENTER_X}
              cy="0"
              r={ARC_RADIUS - 46}
              stroke="#4a7dff"
              strokeWidth="1"
              strokeOpacity="0.15"
            />

            {/* 5. Celestial tick marks along the arc */}
            {CELESTIAL_TICKS.map((tick) => (
              <line
                key={tick.deg}
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={tick.isApex ? "#53e6ff" : "rgba(83, 230, 255, 0.4)"}
                strokeWidth={tick.isApex ? "2" : "1"}
                filter={tick.isApex ? "url(#dial-cyan-glow)" : undefined}
              />
            ))}

            {/* 6. Stardust energy particles on arc */}
            {STARDUST_PARTICLES.map((particle) => (
              <circle
                key={particle.key}
                cx={particle.cx}
                cy={particle.cy}
                r={particle.r}
                fill={particle.fill}
                filter={particle.filter}
              />
            ))}
            </g>
          </g>
        </svg>
      </div>

      {/* Navigation Items mapped along outer rim of the arc (Clean Tactical Sci-Fi Layout) */}
      <div className="chrono-compass__items-track">
        {COMPASS_TABS.map((item, index) => {
          const deltaIndex = index - safeActiveIndex;
          const isFocused = deltaIndex === 0;

          // Angular position relative to apex (0 deg)
          const angleDeg = deltaIndex * STEP_ANGLE_DEG;
          const angleRad = (angleDeg * Math.PI) / 180;

          // Coordinates on the outer arc
          const itemX = Math.round(ITEM_CENTER_X + ITEM_RADIUS * Math.cos(angleRad));
          const itemY = Math.round(ITEM_RADIUS * Math.sin(angleRad));

          // Visual dynamics based on distance from apex
          const distance = Math.abs(deltaIndex);
          const scale = isFocused ? 1 : round2(Math.max(0.75, 0.92 - distance * 0.05));
          const opacity = isFocused ? 1 : round2(Math.max(0.42, 0.72 - distance * 0.08));
          const zIndex = isFocused ? 20 : 10 - distance;

          const ItemIcon = item.icon;

          if (isFocused) {
            return (
              <button
                key={item.id}
                type="button"
                className="chrono-compass__item chrono-compass__item--focused"
                style={{
                  transform: `translate3d(${itemX}px, ${itemY}px, 0) translateY(-50%) scale(${scale})`,
                  opacity,
                  zIndex,
                }}
                onClick={() => {
                  playSfx("click");
                  onConfirmTab(item.id);
                }}
                aria-current="page"
                aria-label={`Current focus: ${item.label}. Click to activate.`}
              >
                {/* Soft Radial Glow Aura behind the item */}
                <div className="chrono-compass__focus-aura" aria-hidden="true" />

                <div className="chrono-compass__item-content">
                  <div className="chrono-compass__item-main">
                    <ItemIcon className="chrono-compass__item-icon" size={17} strokeWidth={2.4} />
                    <h2 className="chrono-compass__item-title">{item.label}</h2>
                    <span className="chrono-compass__diamond-badge" aria-hidden="true">◆</span>
                  </div>

                  {/* Tactical Micro-Dashes underneath */}
                  <div className="chrono-compass__tactical-dashes" aria-hidden="true">
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                    <span className="chrono-compass__dash-pip" />
                  </div>
                </div>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              type="button"
              className="chrono-compass__item chrono-compass__item--unfocused"
              style={{
                transform: `translate3d(${itemX}px, ${itemY}px, 0) translateY(-50%) scale(${scale})`,
                opacity,
                zIndex,
              }}
              onClick={() => {
                playSfx("click");
                onSelectTab(item.id);
              }}
              aria-label={`Select ${item.label}`}
            >
              <div className="chrono-compass__item-content">
                <div className="chrono-compass__item-main">
                  <ItemIcon className="chrono-compass__item-icon" size={15} strokeWidth={2} />
                  <span className="chrono-compass__item-title">{item.label}</span>
                  <span className="chrono-compass__diamond-badge" aria-hidden="true">◆</span>
                </div>

                {/* Tactical Micro-Dashes underneath */}
                <div className="chrono-compass__tactical-dashes" aria-hidden="true">
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                  <span className="chrono-compass__dash-pip" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});
