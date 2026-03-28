import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { ChapterTitleSequence } from "../load-composition";

export const ChapterTitle: React.FC<{ title: ChapterTitleSequence }> = ({
  title,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Fade in over first 0.5s, fade out over last 0.5s
  const fadeInFrames = Math.ceil(fps * 0.5);
  const fadeOutFrames = Math.ceil(fps * 0.5);

  const opacity = interpolate(
    frame,
    [0, fadeInFrames, title.durationInFrames - fadeOutFrames, title.durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Title text springs in
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.8 },
  });

  const translateY = interpolate(titleSpring, [0, 1], [40, 0]);

  // Decorative line grows in
  const lineWidth = interpolate(frame, [8, 25], [0, 200], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      {/* Decorative line above */}
      <div
        style={{
          width: lineWidth,
          height: 3,
          backgroundColor: "#e8b4b8",
          marginBottom: 30,
          borderRadius: 2,
        }}
      />

      {/* Chapter title */}
      <div
        style={{
          fontSize: 64,
          fontWeight: 700,
          fontFamily: "'Georgia', 'Times New Roman', serif",
          color: "#f5f0e8",
          transform: `translateY(${translateY}px)`,
          textAlign: "center",
          padding: "0 120px",
          lineHeight: 1.3,
          letterSpacing: 1,
        }}
      >
        {title.label}
      </div>

      {/* Decorative line below */}
      <div
        style={{
          width: lineWidth * 0.6,
          height: 3,
          backgroundColor: "#e8b4b8",
          marginTop: 30,
          borderRadius: 2,
        }}
      />
    </AbsoluteFill>
  );
};
