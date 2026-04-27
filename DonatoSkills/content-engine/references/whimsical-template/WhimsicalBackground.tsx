import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

// ─────────────────────────────────────────────
// Whimsical Background — 7 themed variants
// ─────────────────────────────────────────────
// Each variant pairs a 3-scene gradient palette with a bubble palette,
// a star palette, and one of 3 shape layouts (A, B, C) so videos using
// different variants look visually distinct, not just recolored.
//
// Add new variants by extending VARIANTS below.
// ─────────────────────────────────────────────

export type WhimsicalTheme = "hook" | "body" | "cta";
export type WhimsicalVariant =
  | "blossom"   // pink / lavender / peach          (original)
  | "meadow"    // mint / cream / sage
  | "dawn"      // peach / coral / butter
  | "dream"     // sky blue / lavender / cream
  | "garden"    // sage / blush / honey
  | "cloud"     // periwinkle / blush / ivory
  | "sunset";   // rose / peach / gold

interface BubbleSpec {
  x: number; baseY: number; size: number;
  speed: number; phase: number; colorIdx: number; opacity: number;
}

interface StarSpec {
  cx: number; cy: number; r: number; colorIdx: number; speed: number; phase: number;
}

// ─── Layouts (bubble & star arrangements) ───
// 3 layouts — videos using different layouts feel structurally different.

const LAYOUT_A_BUBBLES: BubbleSpec[] = [
  { x: 8,  baseY: 15, size: 80, speed: 0.030, phase: 0.0, colorIdx: 0, opacity: 0.45 },
  { x: 85, baseY: 10, size: 55, speed: 0.025, phase: 1.5, colorIdx: 1, opacity: 0.40 },
  { x: 12, baseY: 70, size: 45, speed: 0.040, phase: 0.8, colorIdx: 2, opacity: 0.38 },
  { x: 88, baseY: 62, size: 65, speed: 0.032, phase: 2.2, colorIdx: 0, opacity: 0.42 },
  { x: 50, baseY: 4,  size: 35, speed: 0.050, phase: 1.1, colorIdx: 3, opacity: 0.35 },
  { x: 72, baseY: 85, size: 50, speed: 0.038, phase: 3.0, colorIdx: 1, opacity: 0.38 },
  { x: 22, baseY: 40, size: 28, speed: 0.055, phase: 0.5, colorIdx: 4, opacity: 0.32 },
  { x: 60, baseY: 55, size: 22, speed: 0.060, phase: 2.8, colorIdx: 0, opacity: 0.30 },
];
const LAYOUT_A_STARS: StarSpec[] = [
  { cx: 980, cy: 400,  r: 30, colorIdx: 5, speed: 0.060, phase: 0.0 },
  { cx: 60,  cy: 780,  r: 24, colorIdx: 0, speed: 0.050, phase: 1.2 },
  { cx: 830, cy: 1350, r: 20, colorIdx: 1, speed: 0.070, phase: 2.0 },
  { cx: 480, cy: 1720, r: 28, colorIdx: 5, speed: 0.055, phase: 0.7 },
  { cx: 140, cy: 200,  r: 18, colorIdx: 0, speed: 0.065, phase: 1.8 },
  { cx: 960, cy: 1680, r: 22, colorIdx: 4, speed: 0.050, phase: 0.4 },
];

// Layout B — fewer larger bubbles, more central composition, drifting
const LAYOUT_B_BUBBLES: BubbleSpec[] = [
  { x: 18, baseY: 22, size: 110, speed: 0.022, phase: 0.0, colorIdx: 0, opacity: 0.42 },
  { x: 78, baseY: 30, size: 95,  speed: 0.020, phase: 1.8, colorIdx: 1, opacity: 0.38 },
  { x: 35, baseY: 75, size: 70,  speed: 0.028, phase: 0.6, colorIdx: 2, opacity: 0.40 },
  { x: 88, baseY: 78, size: 55,  speed: 0.034, phase: 2.4, colorIdx: 3, opacity: 0.36 },
  { x: 55, baseY: 12, size: 42,  speed: 0.045, phase: 1.3, colorIdx: 4, opacity: 0.34 },
  { x: 8,  baseY: 55, size: 38,  speed: 0.040, phase: 2.6, colorIdx: 0, opacity: 0.32 },
];
const LAYOUT_B_STARS: StarSpec[] = [
  { cx: 880, cy: 250,  r: 26, colorIdx: 5, speed: 0.045, phase: 0.0 },
  { cx: 200, cy: 920,  r: 32, colorIdx: 4, speed: 0.058, phase: 1.5 },
  { cx: 720, cy: 1540, r: 22, colorIdx: 1, speed: 0.062, phase: 2.4 },
  { cx: 100, cy: 1480, r: 18, colorIdx: 5, speed: 0.052, phase: 0.9 },
  { cx: 950, cy: 1100, r: 24, colorIdx: 0, speed: 0.048, phase: 1.7 },
];

// Layout C — diagonal streak of small bubbles, sparser stars
const LAYOUT_C_BUBBLES: BubbleSpec[] = [
  { x: 10, baseY: 8,  size: 50, speed: 0.030, phase: 0.0, colorIdx: 0, opacity: 0.40 },
  { x: 28, baseY: 25, size: 42, speed: 0.034, phase: 0.7, colorIdx: 1, opacity: 0.38 },
  { x: 45, baseY: 42, size: 36, speed: 0.038, phase: 1.4, colorIdx: 2, opacity: 0.36 },
  { x: 62, baseY: 58, size: 48, speed: 0.032, phase: 2.1, colorIdx: 3, opacity: 0.40 },
  { x: 78, baseY: 75, size: 44, speed: 0.036, phase: 2.8, colorIdx: 0, opacity: 0.38 },
  { x: 92, baseY: 92, size: 38, speed: 0.040, phase: 3.5, colorIdx: 4, opacity: 0.34 },
  { x: 86, baseY: 18, size: 30, speed: 0.050, phase: 1.0, colorIdx: 1, opacity: 0.32 },
  { x: 14, baseY: 80, size: 32, speed: 0.048, phase: 2.4, colorIdx: 2, opacity: 0.34 },
];
const LAYOUT_C_STARS: StarSpec[] = [
  { cx: 540, cy: 380,  r: 28, colorIdx: 5, speed: 0.055, phase: 0.0 },
  { cx: 540, cy: 1540, r: 28, colorIdx: 5, speed: 0.055, phase: 1.5 },
  { cx: 200, cy: 960,  r: 20, colorIdx: 0, speed: 0.065, phase: 0.8 },
  { cx: 880, cy: 960,  r: 20, colorIdx: 4, speed: 0.060, phase: 2.0 },
];

type LayoutKey = "A" | "B" | "C";
const LAYOUTS: Record<LayoutKey, { bubbles: BubbleSpec[]; stars: StarSpec[] }> = {
  A: { bubbles: LAYOUT_A_BUBBLES, stars: LAYOUT_A_STARS },
  B: { bubbles: LAYOUT_B_BUBBLES, stars: LAYOUT_B_STARS },
  C: { bubbles: LAYOUT_C_BUBBLES, stars: LAYOUT_C_STARS },
};

// ─── Variant definitions ───
// gradients: 3-scene gradient (hook/body/cta)
// palette: 6 colors indexed by colorIdx in BUBBLE/STAR specs

interface VariantDef {
  layout: LayoutKey;
  gradients: Record<WhimsicalTheme, string>;
  palette: string[];   // length 6 — referenced by colorIdx 0-5
}

const VARIANTS: Record<WhimsicalVariant, VariantDef> = {
  blossom: {
    layout: "A",
    gradients: {
      hook: "linear-gradient(160deg, #FFD6E8 0%, #E8D4FF 55%, #FFE8D4 100%)",
      body: "linear-gradient(160deg, #D4EEFF 0%, #E8D4FF 55%, #FFE8F5 100%)",
      cta:  "linear-gradient(160deg, #FFF5CC 0%, #FFE4F5 55%, #E8D4FF 100%)",
    },
    palette: ["#FFB6D9", "#C3A8F0", "#A8D8F0", "#B8F0D8", "#F0D8A8", "#FFD700"],
  },
  meadow: {
    layout: "B",
    gradients: {
      hook: "linear-gradient(160deg, #D4F5E0 0%, #FFF5DC 55%, #E8F0D4 100%)",
      body: "linear-gradient(160deg, #E8F5E0 0%, #FAF5E8 55%, #DCEDD8 100%)",
      cta:  "linear-gradient(160deg, #FFFAE0 0%, #E8F5DC 55%, #F0E8D4 100%)",
    },
    palette: ["#A8DCB8", "#F5E8B8", "#D4E8B0", "#FFE8C0", "#C8DCB0", "#F5D88A"],
  },
  dawn: {
    layout: "C",
    gradients: {
      hook: "linear-gradient(160deg, #FFD8C0 0%, #FFE8D0 55%, #FFE0B8 100%)",
      body: "linear-gradient(160deg, #FFE4D0 0%, #FFEED8 55%, #FFD8C8 100%)",
      cta:  "linear-gradient(160deg, #FFF0D0 0%, #FFE0C8 55%, #FFD4B8 100%)",
    },
    palette: ["#FFB89A", "#FFAA88", "#FFD8B0", "#F5C098", "#FFCBA0", "#FFB870"],
  },
  dream: {
    layout: "A",
    gradients: {
      hook: "linear-gradient(160deg, #D0E8FF 0%, #E0D8FF 55%, #FFF5E8 100%)",
      body: "linear-gradient(160deg, #E0EEFF 0%, #E8DCFF 55%, #FFEEE0 100%)",
      cta:  "linear-gradient(160deg, #F0E8FF 0%, #DCE8FF 55%, #FFF0E0 100%)",
    },
    palette: ["#A8C8F5", "#B8A8F0", "#C8B8F5", "#FFE5B8", "#9CB8E8", "#FFD96B"],
  },
  garden: {
    layout: "B",
    gradients: {
      hook: "linear-gradient(160deg, #DCE8D0 0%, #FFE0DC 55%, #FFE8C0 100%)",
      body: "linear-gradient(160deg, #E0EED4 0%, #FFE8E0 55%, #FFEFC8 100%)",
      cta:  "linear-gradient(160deg, #F0F0D4 0%, #FFE4DC 55%, #FFE8C0 100%)",
    },
    palette: ["#B8C896", "#FFB8B0", "#F5C880", "#D8E098", "#E8C8A0", "#F5D050"],
  },
  cloud: {
    layout: "C",
    gradients: {
      hook: "linear-gradient(160deg, #DCE0F5 0%, #FFE0EC 55%, #FFF8E8 100%)",
      body: "linear-gradient(160deg, #E0E4F8 0%, #FFE8F0 55%, #FFF0EC 100%)",
      cta:  "linear-gradient(160deg, #E8ECFA 0%, #FFE0E8 55%, #FFFAEC 100%)",
    },
    palette: ["#A8B0E8", "#FFB8D0", "#C8B8E0", "#FFE0EC", "#B0B8E0", "#F5C8E0"],
  },
  sunset: {
    layout: "A",
    gradients: {
      hook: "linear-gradient(160deg, #FFC8C0 0%, #FFD8B0 55%, #FFE8C0 100%)",
      body: "linear-gradient(160deg, #FFD0CC 0%, #FFDFB8 55%, #FFE8D0 100%)",
      cta:  "linear-gradient(160deg, #FFE0C0 0%, #FFC8B0 55%, #FFD8B8 100%)",
    },
    palette: ["#FF9A8A", "#FFB880", "#FFCEA0", "#F5A0A0", "#FFC890", "#FFAA50"],
  },
};

// ─── Component ───

interface WhimsicalBackgroundProps {
  theme: WhimsicalTheme;
  variant?: WhimsicalVariant;   // defaults to blossom for backward compat
}

function buildStarPath(cx: number, cy: number, r: number): string {
  const inner = r * 0.42;
  let d = "";
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    d += i === 0 ? `M${x},${y}` : `L${x},${y}`;
  }
  return d + "Z";
}

export const WhimsicalBackground: React.FC<WhimsicalBackgroundProps> = ({
  theme,
  variant = "blossom",
}) => {
  const frame = useCurrentFrame();
  const v = VARIANTS[variant];
  const layout = LAYOUTS[v.layout];

  const entrance = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: v.gradients[theme], opacity: entrance }}>
      {layout.bubbles.map((b, i) => {
        const floatY = Math.sin(frame * b.speed + b.phase) * 14;
        return (
          <div
            key={`b${i}`}
            style={{
              position: "absolute",
              left: `${b.x}%`,
              top: `calc(${b.baseY}% + ${floatY}px)`,
              width: b.size,
              height: b.size,
              borderRadius: "50%",
              backgroundColor: v.palette[b.colorIdx % v.palette.length],
              opacity: b.opacity,
              transform: "translate(-50%, -50%)",
            }}
          />
        );
      })}
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid meet"
      >
        {layout.stars.map((s, i) => {
          const pulse = 0.55 + 0.45 * Math.sin(frame * s.speed + s.phase);
          const rotate = (frame * 0.4 + s.phase * 40) % 360;
          return (
            <path
              key={`s${i}`}
              d={buildStarPath(s.cx, s.cy, s.r)}
              fill={v.palette[s.colorIdx % v.palette.length]}
              opacity={0.75 * pulse}
              transform={`rotate(${rotate}, ${s.cx}, ${s.cy})`}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
