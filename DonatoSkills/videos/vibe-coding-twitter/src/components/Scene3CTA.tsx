import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const Scene3CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // "Welcome to the future" slides up
  const line1Progress = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const line1Y = interpolate(line1Progress, [0, 1], [60, 0]);
  const line1Opacity = interpolate(line1Progress, [0, 1], [0, 1]);

  // "where the only skill you need..." fades in
  const line2Delay = 30;
  const line2Progress = spring({
    frame: frame - line2Delay,
    fps,
    config: { damping: 14, stiffness: 100 },
  });
  const line2Opacity = interpolate(line2Progress, [0, 1], [0, 1]);

  // "is knowing what you want." pops in big
  const line3Delay = 80;
  const line3Scale = spring({
    frame: frame - line3Delay,
    fps,
    config: { damping: 8, stiffness: 200, mass: 0.5 },
  });
  const line3Opacity = interpolate(frame - line3Delay, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Animated gradient rotation
  const gradientAngle = interpolate(frame, [0, durationInFrames], [135, 200]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, #1a0533, #0a1628, ${COLORS.background})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 80,
      }}
    >
      {/* Glow orb */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.accent}20, transparent)`,
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${1 + Math.sin(frame * 0.04) * 0.1})`,
        }}
      />

      <div
        style={{
          fontSize: 52,
          fontWeight: 600,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.muted,
          transform: `translateY(${line1Y}px)`,
          opacity: line1Opacity,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        Welcome to the future
      </div>

      <div
        style={{
          fontSize: 40,
          fontWeight: 500,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.muted,
          opacity: line2Opacity,
          textAlign: "center",
          marginBottom: 30,
        }}
      >
        where the only skill you need...
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 900,
          fontFamily: "system-ui, sans-serif",
          color: COLORS.highlight,
          transform: `scale(${line3Scale})`,
          opacity: line3Opacity,
          textAlign: "center",
          textShadow: `0 0 50px ${COLORS.highlight}40`,
          lineHeight: 1.2,
        }}
      >
        is knowing
        <br />
        what you want.
      </div>
    </AbsoluteFill>
  );
};
