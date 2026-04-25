import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

interface TechBackgroundProps {
  durationInFrames: number;
  accentColor?: string;
  accentRgb?: string;
}

export const TechBackground: React.FC<TechBackgroundProps> = ({
  durationInFrames,
  accentColor = "#0EA5E9",
  accentRgb = "14,165,233",
}) => {
  const frame = useCurrentFrame();

  const scanY = interpolate(frame, [0, durationInFrames], [-5, 105], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 0.7 + 0.3 * Math.sin(frame * 0.07);

  const dots: Array<{ cx: number; cy: number; opacity: number }> = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 5; col++) {
      const cx = ((col + 0.5) / 5) * 1080;
      const cy = ((row + 0.5) / 9) * 1920;
      const phase = (row * 5 + col) * 0.41;
      dots.push({ cx, cy, opacity: 0.07 + 0.05 * Math.sin(frame * 0.045 + phase) });
    }
  }

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, #0C1E38 0%, #020810 100%)" }}>
      <svg
        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1080 1920"
        preserveAspectRatio="none"
      >
        {dots.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={3} fill={accentColor} opacity={d.opacity} />
        ))}
        <line x1={0} y1={`${scanY}%`} x2={1080} y2={`${scanY}%`}
          stroke={accentColor} strokeWidth={1} opacity={0.14} />
        <circle cx={540} cy={580} r={320} fill={`rgba(${accentRgb},${(0.042 * pulse).toFixed(3)})`} />
        <circle cx={540} cy={960} r={200} fill={`rgba(${accentRgb},${(0.028 * pulse).toFixed(3)})`} />
      </svg>
    </AbsoluteFill>
  );
};
