import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface AbstractBackgroundProps {
  colorA?: string;
  colorB?: string;
  colorC?: string;
  pulseColor?: string;
  variant?: "soft" | "pulse" | "gradient-shift";
}

export const AbstractBackground: React.FC<AbstractBackgroundProps> = ({
  colorA = "#1a0a2e",
  colorB = "#0f3460",
  colorC = "#16213e",
  pulseColor = "rgba(199,125,255,0.12)",
  variant = "pulse",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Slow gradient shift
  const gradientProgress = interpolate(frame, [0, durationInFrames], [0, 1]);
  const pulseScale = 1 + 0.08 * Math.sin((frame / fps) * Math.PI * 0.8);
  const pulseOpacity = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.2);

  // Slow orbit of accent orbs
  const orb1X = 540 + 180 * Math.sin((frame / fps) * 0.4);
  const orb1Y = 400 + 120 * Math.cos((frame / fps) * 0.3);
  const orb2X = 540 + 150 * Math.cos((frame / fps) * 0.5);
  const orb2Y = 1500 + 100 * Math.sin((frame / fps) * 0.35);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(160deg, ${colorA} 0%, ${colorC} 50%, ${colorB} 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Pulsing central orb — echoes heartbeat */}
      <div
        style={{
          position: "absolute",
          left: orb1X - 200,
          top: orb1Y - 200,
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${pulseColor} 0%, transparent 70%)`,
          transform: `scale(${pulseScale})`,
          opacity: pulseOpacity * 0.8,
        }}
      />
      {/* Bottom orb */}
      <div
        style={{
          position: "absolute",
          left: orb2X - 180,
          top: orb2Y - 180,
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: `radial-gradient(circle, rgba(123,45,139,0.2) 0%, transparent 70%)`,
          opacity: 0.6 + 0.4 * Math.sin((frame / fps) * 0.6),
        }}
      />
      {/* Subtle grid lines */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(199,125,255,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(199,125,255,0.04) 1px, transparent 1px)
          `,
          backgroundSize: "120px 120px",
          opacity: interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" }),
        }}
      />
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)",
        }}
      />
    </div>
  );
};
