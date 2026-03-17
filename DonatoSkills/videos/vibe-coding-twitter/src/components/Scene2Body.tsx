import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const Scene2Body: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const items = [
    { text: "It just... works.", color: COLORS.accent3, delay: 0 },
    { text: "No boilerplate.", color: COLORS.highlight, delay: 35 },
    { text: "No Stack Overflow\nrabbit holes.", color: COLORS.accent2, delay: 70 },
    { text: "Just vibes.", color: COLORS.accent, delay: 120 },
  ];

  // Background pulse
  const bgPulse = interpolate(Math.sin(frame * 0.05), [-1, 1], [0.95, 1.05]);

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, #0f1a2e, ${COLORS.background})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
        transform: `scale(${bgPulse})`,
      }}
    >
      {items.map((item, i) => {
        const scale = spring({
          frame: frame - item.delay,
          fps,
          config: { damping: 10, stiffness: 250, mass: 0.5 },
        });
        const opacity = interpolate(frame - item.delay, [0, 8], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // "Just vibes" gets special treatment — bigger, glowing
        const isVibes = i === items.length - 1;

        return (
          <div
            key={i}
            style={{
              fontSize: isVibes ? 96 : 60,
              fontWeight: isVibes ? 900 : 700,
              fontFamily: "system-ui, sans-serif",
              color: item.color,
              transform: `scale(${scale})`,
              opacity,
              textAlign: "center",
              marginBottom: isVibes ? 0 : 20,
              lineHeight: 1.2,
              textShadow: isVibes ? `0 0 40px ${item.color}60` : "none",
              whiteSpace: "pre-line",
            }}
          >
            {item.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
