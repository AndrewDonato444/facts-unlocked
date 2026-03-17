import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title slam effect
  const titleScale = spring({ frame, fps, config: { damping: 6, stiffness: 300, mass: 0.5 } });
  const titleOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Strikethrough animation on "writing code"
  const strikeProgress = interpolate(frame, [30, 50], [0, 100], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // "shipping vibes" fades in after strike
  const vibesOpacity = interpolate(frame, [50, 65], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const vibesY = interpolate(frame, [50, 65], [20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 40%, #1a1040, ${COLORS.background})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Floating particles */}
      {Array.from({ length: 12 }, (_, i) => {
        const x = (i * 137.5) % 1080;
        const baseY = (i * 97.3) % 1080;
        const y = baseY + Math.sin(frame * 0.03 + i) * 20;
        const size = 3 + (i % 3) * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              backgroundColor: i % 2 === 0 ? COLORS.accent : COLORS.accent2,
              opacity: 0.15,
            }}
          />
        );
      })}

      {/* "I STOPPED" */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.text,
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: "center",
          letterSpacing: -2,
        }}
      >
        I STOPPED
      </div>

      {/* "writing code" with strikethrough */}
      <div
        style={{
          fontSize: 80,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.muted,
          textAlign: "center",
          letterSpacing: -2,
          position: "relative",
          marginTop: 10,
          opacity: titleOpacity,
        }}
      >
        writing code
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            height: 6,
            width: `${strikeProgress}%`,
            backgroundColor: COLORS.accent,
            borderRadius: 3,
          }}
        />
      </div>

      {/* "shipping vibes" replacement */}
      <div
        style={{
          fontSize: 90,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.accent,
          textAlign: "center",
          letterSpacing: -2,
          marginTop: 20,
          opacity: vibesOpacity,
          transform: `translateY(${vibesY}px)`,
          textShadow: `0 0 40px ${COLORS.accent}80`,
        }}
      >
        shipping vibes ✨
      </div>
    </AbsoluteFill>
  );
};
