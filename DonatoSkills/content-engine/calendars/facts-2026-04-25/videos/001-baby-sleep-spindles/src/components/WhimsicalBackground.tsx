import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

export type WhimsicalTheme = "hook" | "body" | "cta";

interface WhimsicalBackgroundProps {
  theme: WhimsicalTheme;
}

const GRADIENTS: Record<WhimsicalTheme, string> = {
  hook: "linear-gradient(160deg, #FFD6E8 0%, #E8D4FF 55%, #FFE8D4 100%)",
  body: "linear-gradient(160deg, #D4EEFF 0%, #E8D4FF 55%, #FFE8F5 100%)",
  cta:  "linear-gradient(160deg, #FFF5CC 0%, #FFE4F5 55%, #E8D4FF 100%)",
};

interface BubbleSpec {
  x: number; baseY: number; size: number;
  speed: number; phase: number; color: string; opacity: number;
}

const BUBBLES: BubbleSpec[] = [
  { x: 8,  baseY: 15, size: 80, speed: 0.030, phase: 0.0, color: "#FFB6D9", opacity: 0.45 },
  { x: 85, baseY: 10, size: 55, speed: 0.025, phase: 1.5, color: "#C3A8F0", opacity: 0.40 },
  { x: 12, baseY: 70, size: 45, speed: 0.040, phase: 0.8, color: "#A8D8F0", opacity: 0.38 },
  { x: 88, baseY: 62, size: 65, speed: 0.032, phase: 2.2, color: "#FFB6D9", opacity: 0.42 },
  { x: 50, baseY: 4,  size: 35, speed: 0.050, phase: 1.1, color: "#B8F0D8", opacity: 0.35 },
  { x: 72, baseY: 85, size: 50, speed: 0.038, phase: 3.0, color: "#C3A8F0", opacity: 0.38 },
  { x: 22, baseY: 40, size: 28, speed: 0.055, phase: 0.5, color: "#F0D8A8", opacity: 0.32 },
  { x: 60, baseY: 55, size: 22, speed: 0.060, phase: 2.8, color: "#FFB6D9", opacity: 0.30 },
];

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

interface StarSpec {
  cx: number; cy: number; r: number; color: string; speed: number; phase: number;
}

// Coordinates in 1080×1920 space
const STARS: StarSpec[] = [
  { cx: 980, cy: 400,  r: 30, color: "#FFD700", speed: 0.060, phase: 0.0 },
  { cx: 60,  cy: 780,  r: 24, color: "#FF9ECD", speed: 0.050, phase: 1.2 },
  { cx: 830, cy: 1350, r: 20, color: "#C3A8F0", speed: 0.070, phase: 2.0 },
  { cx: 480, cy: 1720, r: 28, color: "#FFD700", speed: 0.055, phase: 0.7 },
  { cx: 140, cy: 200,  r: 18, color: "#FF9ECD", speed: 0.065, phase: 1.8 },
  { cx: 960, cy: 1680, r: 22, color: "#B8F0D8", speed: 0.050, phase: 0.4 },
];

export const WhimsicalBackground: React.FC<WhimsicalBackgroundProps> = ({ theme }) => {
  const frame = useCurrentFrame();

  const entrance = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ background: GRADIENTS[theme], opacity: entrance }}>
      {BUBBLES.map((b, i) => {
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
              backgroundColor: b.color,
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
        {STARS.map((s, i) => {
          const pulse = 0.55 + 0.45 * Math.sin(frame * s.speed + s.phase);
          const rotate = (frame * 0.4 + s.phase * 40) % 360;
          return (
            <path
              key={`s${i}`}
              d={buildStarPath(s.cx, s.cy, s.r)}
              fill={s.color}
              opacity={0.75 * pulse}
              transform={`rotate(${rotate}, ${s.cx}, ${s.cy})`}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
