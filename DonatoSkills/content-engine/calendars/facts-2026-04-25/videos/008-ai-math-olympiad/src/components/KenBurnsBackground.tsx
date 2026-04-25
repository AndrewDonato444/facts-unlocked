import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";

type KenBurnsDirection = "zoom-in" | "zoom-out" | "pan-left" | "pan-right" | "zoom-in-left" | "zoom-out-right";

interface KenBurnsBackgroundProps {
  asset: string;
  direction: KenBurnsDirection;
  overlay?: string;
  durationInFrames: number;
}

export const KenBurnsBackground: React.FC<KenBurnsBackgroundProps> = ({
  asset, direction, overlay = "rgba(2,5,12,0.62)", durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  let scale = 1, translateX = 0, translateY = 0;
  switch (direction) {
    case "zoom-in": scale = interpolate(progress, [0, 1], [1.0, 1.12]); break;
    case "zoom-out": scale = interpolate(progress, [0, 1], [1.12, 1.0]); break;
    case "pan-left": scale = 1.08; translateX = interpolate(progress, [0, 1], [3, -3]); break;
    case "pan-right": scale = 1.08; translateX = interpolate(progress, [0, 1], [-3, 3]); break;
    case "zoom-in-left": scale = interpolate(progress, [0, 1], [1.0, 1.10]); translateX = interpolate(progress, [0, 1], [0, -2]); break;
    case "zoom-out-right": scale = interpolate(progress, [0, 1], [1.10, 1.0]); translateX = interpolate(progress, [0, 1], [-2, 0]); break;
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `scale(${scale}) translate(${translateX}%, ${translateY}%)`, transformOrigin: "center center", willChange: "transform" }}>
        <Img src={staticFile(`generated/${asset}.png`)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: overlay }} />
    </AbsoluteFill>
  );
};
