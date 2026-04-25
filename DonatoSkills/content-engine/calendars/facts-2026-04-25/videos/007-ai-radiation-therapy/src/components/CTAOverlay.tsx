import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, CTA_TEXT, CHANNEL_TAG } from "../lib/constants";

export const CTAOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideProgress = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 150, mass: 0.7 } });
  const translateY = interpolate(slideProgress, [0, 1], [160, 0]);
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = interpolate(Math.sin((frame / 12) * Math.PI), [-1, 1], [0.90, 1.0]);

  return (
    <AbsoluteFill style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 48px",
      opacity,
    }}>
      <div style={{ transform: `translateY(${translateY}px)`, display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
        <div style={{
          color: COLORS.textPrimary,
          fontSize: 72,
          fontWeight: 900,
          textAlign: "center",
          fontFamily: "sans-serif",
          lineHeight: 1.2,
          textShadow: `0 0 40px rgba(14,165,233,0.50), 0 4px 20px rgba(0,0,0,0.80)`,
        }}>{CTA_TEXT}</div>
        <div style={{
          transform: `scale(${pulse})`,
          backgroundColor: "rgba(14,165,233,0.12)",
          borderRadius: 12,
          paddingLeft: 28,
          paddingRight: 28,
          paddingTop: 14,
          paddingBottom: 14,
          border: `2px solid ${COLORS.blue}`,
          filter: `drop-shadow(0 0 14px rgba(14,165,233,0.45))`,
        }}>
          <span style={{
            color: COLORS.cyanBright,
            fontSize: 36,
            fontWeight: 700,
            fontFamily: "sans-serif",
            letterSpacing: 1,
          }}>{CHANNEL_TAG}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
