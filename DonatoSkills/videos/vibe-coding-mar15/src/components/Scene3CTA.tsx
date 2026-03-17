import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const Scene3CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main text slam
  const scale = spring({ frame, fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });
  const opacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Punchline delay
  const punchOpacity = interpolate(frame, [40, 55], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const punchY = interpolate(frame, [40, 55], [30, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Pulsing glow
  const glowIntensity = 40 + Math.sin(frame * 0.1) * 20;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, #1a0a30, ${COLORS.background})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* The future of coding */}
      <div
        style={{
          fontSize: 56,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.muted,
          textAlign: "center",
          transform: `scale(${scale})`,
          opacity,
        }}
      >
        The future of coding
      </div>

      {/* ISN'T CODE */}
      <div
        style={{
          fontSize: 100,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.text,
          textAlign: "center",
          transform: `scale(${scale})`,
          opacity,
          marginTop: 10,
          textShadow: `0 0 ${glowIntensity}px ${COLORS.accent}80`,
        }}
      >
        ISN'T CODE
      </div>

      {/* Punchline */}
      <div
        style={{
          fontSize: 44,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.highlight,
          textAlign: "center",
          marginTop: 50,
          opacity: punchOpacity,
          transform: `translateY(${punchY}px)`,
        }}
      >
        It's a really good description
        <br />
        of what you want 🍕
      </div>
    </AbsoluteFill>
  );
};
