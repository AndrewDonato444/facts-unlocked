import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // "VIBE CODING" pops in huge
  const titleScale = spring({ frame, fps, config: { damping: 8, stiffness: 200, mass: 0.6 } });
  const titleOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Subtitle lines stagger in
  const lines = [
    "You describe the app.",
    "The AI builds it.",
    "You sip coffee. ☕",
  ];

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, #1a1040, ${COLORS.background})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 60,
      }}
    >
      {/* Floating particles */}
      {Array.from({ length: 15 }, (_, i) => {
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

      {/* VIBE CODING title */}
      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.text,
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: "center",
          lineHeight: 1.1,
          letterSpacing: -3,
          textShadow: `0 0 60px ${COLORS.accent}80`,
        }}
      >
        VIBE
        <br />
        <span style={{ color: COLORS.accent }}>CODING</span>
      </div>

      {/* Subtitle lines */}
      <div style={{ marginTop: 50, textAlign: "center" }}>
        {lines.map((line, i) => {
          const delay = 25 + i * 20;
          const progress = spring({
            frame: frame - delay,
            fps,
            config: { damping: 14, stiffness: 120 },
          });
          const translateY = interpolate(progress, [0, 1], [40, 0]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);

          return (
            <div
              key={i}
              style={{
                fontSize: 44,
                fontWeight: 600,
                fontFamily: "system-ui, sans-serif",
                color: COLORS.text,
                transform: `translateY(${translateY}px)`,
                opacity,
                marginBottom: 12,
              }}
            >
              {line}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
