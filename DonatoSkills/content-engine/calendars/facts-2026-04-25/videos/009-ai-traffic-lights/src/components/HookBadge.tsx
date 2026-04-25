import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, HOOK_BADGE_TEXT, HOOK_TEXT, HOOK_STAT_TEXT } from "../lib/constants";

export const HookBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeProgress = spring({ frame, fps, config: { damping: 14, stiffness: 200, mass: 0.5 } });
  const badgeY = interpolate(badgeProgress, [0, 1], [-140, 0]);
  const badgeOpacity = interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const hookScale = spring({ frame: frame - 8, fps, config: { damping: 10, stiffness: 240, mass: 0.45 } });
  const hookOpacity = interpolate(frame - 8, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const glowPulse = interpolate(Math.sin((frame / 12) * Math.PI), [-1, 1], [0.65, 1.0]);

  const statProgress = spring({ frame: frame - 22, fps, config: { damping: 11, stiffness: 260, mass: 0.4 } });
  const statOpacity = interpolate(frame - 22, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 56px",
    }}>
      <div style={{
        transform: `translateY(${badgeY}px)`,
        opacity: badgeOpacity,
        backgroundColor: "rgba(16,185,129,0.12)",
        borderRadius: 100,
        paddingLeft: 32,
        paddingRight: 32,
        paddingTop: 12,
        paddingBottom: 12,
        marginBottom: 28,
        border: `2px solid ${COLORS.green}`,
        filter: `drop-shadow(0 0 ${18 * glowPulse}px rgba(16,185,129,0.55))`,
      }}>
        <span style={{
          color: COLORS.greenBright,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: 3,
          fontFamily: "sans-serif",
        }}>{HOOK_BADGE_TEXT}</span>
      </div>

      <div style={{ transform: `scale(${hookScale})`, opacity: hookOpacity, textAlign: "center" }}>
        {HOOK_TEXT.split("\n").map((line, i) => (
          <div key={i} style={{
            color: i === 1 ? COLORS.greenBright : COLORS.textPrimary,
            fontSize: i === 1 ? 82 : 68,
            fontWeight: 900,
            lineHeight: 1.1,
            fontFamily: "sans-serif",
            textShadow: i === 1
              ? `0 0 40px rgba(52,211,153,0.60), 0 4px 16px rgba(0,0,0,0.85)`
              : "0 4px 24px rgba(0,0,0,0.85)",
            letterSpacing: -1,
          }}>{line}</div>
        ))}
      </div>

      <div style={{
        transform: `scale(${statProgress})`,
        opacity: statOpacity,
        marginTop: 32,
        backgroundColor: "rgba(20,184,166,0.10)",
        borderRadius: 14,
        paddingLeft: 26,
        paddingRight: 26,
        paddingTop: 13,
        paddingBottom: 13,
        border: `1px solid rgba(20,184,166,0.40)`,
      }}>
        <span style={{
          color: COLORS.tealBright,
          fontSize: 34,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: 1,
          textShadow: `0 0 14px rgba(45,212,191,0.45)`,
        }}>{HOOK_STAT_TEXT}</span>
      </div>
    </AbsoluteFill>
  );
};
