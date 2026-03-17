import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const Scene2Body: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { emoji: "💬", label: "Describe it", color: COLORS.accent2 },
    { emoji: "⚡", label: "AI builds it", color: COLORS.accent },
    { emoji: "☕", label: "Sip coffee", color: COLORS.highlight },
    { emoji: "🚀", label: "Ship it", color: COLORS.accent3 },
  ];

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, #0d0d1a, ${COLORS.background})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Title */}
      <div
        style={{
          fontSize: 52,
          fontWeight: 800,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.text,
          textAlign: "center",
          marginBottom: 60,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
        }}
      >
        The workflow:
      </div>

      {/* Steps pop in */}
      {items.map((item, i) => {
        const delay = 10 + i * 18;
        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 10, stiffness: 150 },
        });
        const x = interpolate(progress, [0, 1], [-100, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);

        return (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginBottom: 30,
              transform: `translateX(${x}px)`,
              opacity,
            }}
          >
            <div
              style={{
                fontSize: 60,
                width: 80,
                height: 80,
                borderRadius: 20,
                backgroundColor: `${item.color}20`,
                border: `2px solid ${item.color}60`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.emoji}
            </div>
            <div
              style={{
                fontSize: 48,
                fontWeight: 700,
                fontFamily: "system-ui, sans-serif",
                color: COLORS.text,
              }}
            >
              {item.label}
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
