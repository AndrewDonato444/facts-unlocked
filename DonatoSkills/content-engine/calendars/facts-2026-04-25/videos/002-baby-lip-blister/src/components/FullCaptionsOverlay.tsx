import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

export interface CaptionPhrase {
  text: string;
  startSec: number;
  endSec: number;
}

interface FullCaptionsOverlayProps {
  phrases: CaptionPhrase[];
}

export const FullCaptionsOverlay: React.FC<FullCaptionsOverlayProps> = ({ phrases }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentSec = frame / fps;

  const activeIndex = phrases.findIndex(
    (p) => currentSec >= p.startSec && currentSec < p.endSec
  );

  if (activeIndex === -1) return null;

  const active = phrases[activeIndex];
  const localFrame = Math.floor((currentSec - active.startSec) * fps);

  const entryScale = spring({
    frame: localFrame,
    fps,
    config: { damping: 15, stiffness: 200, mass: 0.4 },
  });

  const opacity = interpolate(localFrame, [0, 6], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 240,
        left: 60,
        right: 60,
        textAlign: "center",
        transform: `scale(${0.9 + entryScale * 0.1})`,
        opacity,
      }}
    >
      <div
        style={{
          background: "rgba(0,0,0,0.65)",
          borderRadius: 20,
          padding: "20px 32px",
          display: "inline-block",
          boxShadow: `0 4px 24px rgba(255,107,157,0.15)`,
          border: `1px solid ${COLORS.primary}33`,
        }}
      >
        <p
          style={{
            fontSize: 50,
            fontWeight: 700,
            fontFamily: "Arial, sans-serif",
            color: "#FFFFFF",
            margin: 0,
            textShadow: "1px 1px 3px rgba(0,0,0,0.9)",
            lineHeight: 1.4,
          }}
        >
          {active.text}
        </p>
      </div>
    </div>
  );
};
