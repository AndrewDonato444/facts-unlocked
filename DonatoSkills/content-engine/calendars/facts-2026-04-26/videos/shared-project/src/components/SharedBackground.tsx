import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface SharedBackgroundProps {
  palette: { bg1: string; bg2: string; accent: string; textHigh: string };
  variant?: "calm" | "tense" | "pulse";
}

export const SharedBackground: React.FC<SharedBackgroundProps> = ({ palette, variant = "calm" }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const speed = variant === "tense" ? 1.5 : variant === "pulse" ? 1.0 : 0.5;
  const orb1X = 540 + 200 * Math.sin((frame / fps) * speed * 0.4);
  const orb1Y = 480 + 140 * Math.cos((frame / fps) * speed * 0.3);
  const orb2X = 540 + 180 * Math.cos((frame / fps) * speed * 0.5);
  const orb2Y = 1440 + 120 * Math.sin((frame / fps) * speed * 0.35);
  const pulseScale = 1 + (variant === "pulse" ? 0.12 : 0.06) * Math.sin((frame / fps) * Math.PI * 0.8);
  const orbAlpha = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.1);

  return (
    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(155deg, ${palette.bg1} 0%, ${palette.bg2} 100%)`, overflow: "hidden" }}>
      {/* Primary orb */}
      <div style={{
        position: "absolute", left: orb1X - 220, top: orb1Y - 220,
        width: 440, height: 440, borderRadius: "50%",
        background: `radial-gradient(circle, ${palette.accent}22 0%, transparent 70%)`,
        transform: `scale(${pulseScale})`, opacity: orbAlpha * 0.9,
      }} />
      {/* Secondary orb */}
      <div style={{
        position: "absolute", left: orb2X - 180, top: orb2Y - 180,
        width: 360, height: 360, borderRadius: "50%",
        background: `radial-gradient(circle, ${palette.accent}18 0%, transparent 70%)`,
        opacity: 0.5 + 0.3 * Math.sin((frame / fps) * 0.55),
      }} />
      {/* Grid */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(${palette.accent}06 1px, transparent 1px), linear-gradient(90deg, ${palette.accent}06 1px, transparent 1px)`,
        backgroundSize: "120px 120px",
        opacity: interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" }),
      }} />
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.65) 100%)" }} />
    </div>
  );
};
