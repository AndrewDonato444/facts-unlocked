import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";

type KenBurnsDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "zoom-in-left" | "zoom-in-right";

interface KenBurnsBackgroundProps {
  asset: string;
  direction?: KenBurnsDirection;
  overlay?: string;
  durationInFrames?: number;
}

export const KenBurnsBackground: React.FC<KenBurnsBackgroundProps> = ({
  asset,
  direction = "zoom-in",
  overlay = "rgba(0,0,0,0.4)",
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames: compDuration } = useVideoConfig();
  const totalFrames = durationInFrames ?? compDuration;
  const progress = Math.min(frame / totalFrames, 1);

  let transform = "";
  switch (direction) {
    case "zoom-in":
      transform = `scale(${interpolate(progress, [0, 1], [1.0, 1.15])})`;
      break;
    case "zoom-out":
      transform = `scale(${interpolate(progress, [0, 1], [1.15, 1.0])})`;
      break;
    case "pan-left":
      transform = `scale(1.1) translateX(${interpolate(progress, [0, 1], [5, -5])}%)`;
      break;
    case "pan-right":
      transform = `scale(1.1) translateX(${interpolate(progress, [0, 1], [-5, 5])}%)`;
      break;
    case "zoom-in-left":
      transform = `scale(${interpolate(progress, [0, 1], [1.0, 1.12])}) translateX(${interpolate(progress, [0, 1], [0, -3])}%)`;
      break;
    case "zoom-in-right":
      transform = `scale(${interpolate(progress, [0, 1], [1.0, 1.12])}) translateX(${interpolate(progress, [0, 1], [0, 3])}%)`;
      break;
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform,
          willChange: "transform",
        }}
      >
        <Img
          src={staticFile(`generated/${asset}.png`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: overlay }} />
    </AbsoluteFill>
  );
};
