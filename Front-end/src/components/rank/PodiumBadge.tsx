"use client";

import { useId } from "react";

type Palette = { light: string; mid: string; dark: string; ink: string };

const PALETTES: Record<1 | 2 | 3, Palette> = {
  1: { light: "#fff6c4", mid: "#f4c542", dark: "#9a6a12", ink: "#4a2f05" },
  2: { light: "#ffffff", mid: "#c3d8ee", dark: "#6682a3", ink: "#1d3350" },
  3: { light: "#ffdcbc", mid: "#d98a4e", dark: "#7f4220", ink: "#3d1a08" },
};

/** Leaves along the left half of the wreath: centre x, centre y, tilt in degrees (the right half mirrors it). */
const LEAVES: Array<[number, number, number]> = [
  [14.5, 47, -58],
  [10.5, 42, -42],
  [7.5, 36, -24],
  [6, 29, -6],
  [6.3, 22, 12],
  [8, 16, 30],
  [11.5, 11.5, 48],
];

/** Stroked numerals centred in the shield face (x = 24, y = 25 to 38). */
const NUMERALS: Record<1 | 2 | 3, string> = {
  1: "M21.5 28.2 L25 25.4 V37.6",
  2: "M19.8 28.4 C20.6 24.4 28.6 24.4 28.4 29 C28.3 32.2 22.8 34.2 19.6 37.6 H28.8",
  3: "M19.8 27 C21 24.4 28.2 24.4 28.2 28.3 C28.2 31.2 25.4 31.6 23.8 31.6 C25.6 31.6 28.8 32.2 28.8 35 C28.8 38.4 21 38.8 19.4 35.6",
};

/** Chevron stripes under the numeral: one more for each place closer to the top. */
const CHEVRONS: Record<1 | 2 | 3, number> = { 1: 3, 2: 2, 3: 1 };

function Ornament({ rank, fill, stroke }: { rank: 1 | 2 | 3; fill: string; stroke: string }) {
  if (rank === 1) {
    // Five-point royal crown: orb-tipped peaks, a shaded right half, a jewelled band and a ruby centre.
    const outline = "M12.5 13.4 L11.5 5.6 L17 9.2 L18.5 3.8 L21.6 8.6 L24 0.6 L26.4 8.6 L29.5 3.8 L31 9.2 L36.5 5.6 L35.5 13.4 Z";
    return (
      <g>
        <path d={outline} fill={fill} stroke={stroke} strokeWidth="0.7" strokeLinejoin="round" />
        <path d="M24 0.6 L26.4 8.6 L29.5 3.8 L31 9.2 L36.5 5.6 L35.5 13.4 L24 13.4 Z" fill={stroke} opacity="0.28" />
        <path d="M12 6.2 L17 9.6 M18.9 4.6 L21.8 9 M24 1.4 L25.4 7.4" stroke="#fff" strokeOpacity="0.6" strokeWidth="0.5" strokeLinecap="round" />
        {/* Orbs on the peaks */}
        {[[11.5, 5.2, 1.1], [18.5, 3.4, 1.1], [24, 0.5, 1.5], [29.5, 3.4, 1.1], [36.5, 5.2, 1.1]].map(([cx, cy, r], index) => (
          <circle key={index} cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth="0.5" />
        ))}
        {/* Band */}
        <rect x="12.4" y="10.4" width="23.2" height="4" rx="1" fill={fill} stroke={stroke} strokeWidth="0.7" />
        <path d="M13 11.5 H35" stroke="#fff" strokeOpacity="0.55" strokeWidth="0.4" />
        {/* Jewels */}
        <circle cx="24" cy="12.4" r="1.5" fill="#ff3d63" stroke="#7a0f26" strokeWidth="0.4" />
        <circle cx="23.5" cy="11.9" r="0.45" fill="#fff" opacity="0.85" />
        <circle cx="18.6" cy="12.4" r="1" fill="#38d4ff" stroke="#0b5a78" strokeWidth="0.35" />
        <circle cx="29.4" cy="12.4" r="1" fill="#38d4ff" stroke="#0b5a78" strokeWidth="0.35" />
        <circle cx="14.6" cy="12.4" r="0.7" fill="#5dffb0" stroke="#0b6a43" strokeWidth="0.3" />
        <circle cx="33.4" cy="12.4" r="0.7" fill="#5dffb0" stroke="#0b6a43" strokeWidth="0.3" />
      </g>
    );
  }
  if (rank === 2) {
    // Five-point star.
    return (
      <path
        d="M24 1.5 L26.4 7.4 L32.7 7.9 L27.9 12 L29.4 18.2 L24 14.9 L18.6 18.2 L20.1 12 L15.3 7.9 L21.6 7.4 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
    );
  }
  // Faceted gem.
  return (
    <g>
      <path d="M24 2 L30 8 L24 15 L18 8 Z" fill={fill} stroke={stroke} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M18 8 H30 M24 2 L21.5 8 L24 15 L26.5 8 Z" fill="none" stroke={stroke} strokeWidth="0.5" opacity="0.7" />
    </g>
  );
}

/**
 * Winner badge for the podium: a metal shield with a laurel wreath, a rank ornament
 * (crown, star, gem) and the rank numeral. Purely decorative geometry; the text label is on the SVG.
 */
export function PodiumBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const uid = useId().replace(/:/g, "");
  const palette = PALETTES[rank];
  const metal = `pb-metal-${uid}`;
  const face = `pb-face-${uid}`;
  const shine = `pb-shine-${uid}`;
  const clip = `pb-clip-${uid}`;
  const glow = `pb-glow-${uid}`;

  return (
    <svg
      className={`podium-badge podium-badge--${rank}`}
      width="48"
      height="56"
      viewBox="0 0 48 56"
      role="img"
      aria-label={`Rank ${rank}`}
    >
      <defs>
        <clipPath id={clip}>
          <path d="M24 12.5 L36.5 17.2 V30 C36.5 38 31 43.8 24 48 C17 43.8 11.5 38 11.5 30 V17.2 Z" />
        </clipPath>
        <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={palette.light} />
          <stop offset="0.45" stopColor={palette.mid} />
          <stop offset="0.75" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <linearGradient id={face} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.mid} stopOpacity="0.95" />
          <stop offset="1" stopColor={palette.dark} />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={glow} cx="0.35" cy="0.2" r="0.75">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Laurel wreath, mirrored on both sides, with a vein on each leaf. */}
      {LEAVES.map(([x, y, tilt], index) => (
        <g key={index}>
          <g transform={`rotate(${tilt} ${x} ${y})`}>
            <ellipse cx={x} cy={y} rx="1.9" ry="4.3" fill={`url(#${metal})`} stroke={palette.dark} strokeWidth="0.3" />
            <path d={`M${x} ${y - 3.6} V${y + 3.6}`} stroke={palette.dark} strokeWidth="0.35" opacity="0.7" />
          </g>
          <g transform={`rotate(${-tilt} ${48 - x} ${y})`}>
            <ellipse cx={48 - x} cy={y} rx="1.9" ry="4.3" fill={`url(#${metal})`} stroke={palette.dark} strokeWidth="0.3" />
            <path d={`M${48 - x} ${y - 3.6} V${y + 3.6}`} stroke={palette.dark} strokeWidth="0.35" opacity="0.7" />
          </g>
        </g>
      ))}
      <circle cx="4.5" cy="32" r="1" fill={palette.light} stroke={palette.dark} strokeWidth="0.3" />
      <circle cx="43.5" cy="32" r="1" fill={palette.light} stroke={palette.dark} strokeWidth="0.3" />

      {/* Shield: beaded metal rim, a dark bevel, then the face. */}
      <path d="M24 9 L40 15 V30 C40 40 33 47 24 52 C15 47 8 40 8 30 V15 Z" fill={`url(#${metal})`} stroke={palette.light} strokeWidth="0.8" strokeLinejoin="round" />
      <path d="M24 10.6 L38.6 16 V30 C38.6 39 32.3 45.6 24 50.3 C15.7 45.6 9.4 39 9.4 30 V16 Z" fill="none" stroke={palette.dark} strokeOpacity="0.55" strokeWidth="0.5" strokeDasharray="1.1 1.3" strokeLinejoin="round" />
      <path d="M24 12.5 L36.5 17.2 V30 C36.5 38 31 43.8 24 48 C17 43.8 11.5 38 11.5 30 V17.2 Z" fill={`url(#${face})`} stroke={palette.light} strokeOpacity="0.7" strokeWidth="0.6" strokeLinejoin="round" />
      <path d="M24 12.5 L36.5 17.2 V30 C36.5 38 31 43.8 24 48 C17 43.8 11.5 38 11.5 30 V17.2 Z" fill={`url(#${glow})`} />
      <path d="M13 19 L24 14.8 L35 19" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="0.7" />
      {/* Rivets */}
      <circle cx="14.2" cy="20.5" r="0.9" fill={palette.light} stroke={palette.dark} strokeWidth="0.3" />
      <circle cx="33.8" cy="20.5" r="0.9" fill={palette.light} stroke={palette.dark} strokeWidth="0.3" />

      {/* Rank stripes */}
      {Array.from({ length: CHEVRONS[rank] }, (_, index) => {
        const y = 41 + index * 2.9;
        const half = 8 - index * 1.9;
        return (
          <path
            key={index}
            d={`M${24 - half} ${y} L24 ${y + 3.2} L${24 + half} ${y}`}
            fill="none"
            stroke={palette.light}
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.9"
          />
        );
      })}

      {/* Moving sheen, clipped to the shield face. */}
      <g clipPath={`url(#${clip})`}>
        <rect className="podium-badge__shine" x="-8" y="8" width="12" height="46" fill={`url(#${shine})`} transform="skewX(-20)" />
      </g>

      {/* Numeral drawn as a path, not text, so it is rasterised exactly like the shield while the badge floats. */}
      <g transform="translate(24 29.8) scale(0.78) translate(-24 -31.5)">
        <path d={NUMERALS[rank]} fill="none" stroke={palette.light} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        <path d={NUMERALS[rank]} fill="none" stroke={palette.ink} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      <Ornament rank={rank} fill={`url(#${metal})`} stroke={palette.dark} />
    </svg>
  );
}
