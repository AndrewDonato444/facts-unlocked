import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

interface HookOverlayProps {
  lines: string[];
}

export const HookOverlay: React.FC<HookOverlayProps> = ({ lines }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        paddingLeft: 60,
        paddingRight: 60,
      }}
    >
      <div style={{ textAlign: "center" }}>
        {lines.map((line, i) => {
          const delay = i * 8;
          const s = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 180, mass: 0.5 },
          });
          const opacity = interpolate(frame - delay, [0, 8], [0, 1], {
            extrapolateRight: "clamp",
            extrapolateLeft: "clamp",
          });
          const translateY = interpolate(s, [0, 1], [40, 0]);

          return (
            <div
              key={i}
              style={{
                opacity,
                transform: `translateY(${translateY}px) scale(${0.85 + s * 0.15})`,
                display: "block",
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  fontSize: i === 0 ? 88 : 82,
                  fontWeight: 900,
                  fontFamily: "Arial Black, Arial, sans-serif",
                  color: i === 1 ? COLORS.primary : "#FFFFFF",
                  textShadow: "3px 3px 0px rgba(0,0,0,0.8), 0 0 30px rgba(0,0,0,0.5)",
                  lineHeight: 1.1,
                  letterSpacing: "-1px",
                  display: "block",
                }}
              >
                {line}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
