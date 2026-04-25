import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, HOOK_BADGE_TEXT, HOOK_TEXT } from "../lib/constants";

export const HookBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fast crash-in for fast-pace video
  const badgeProgress = spring({ frame, fps, config: { damping: 12, stiffness: 280, mass: 0.4 } });
  const badgeY = interpolate(badgeProgress, [0, 1], [-160, 0]);
  const badgeOpacity = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Hook text — tight spring for fast feel
  const hookScale = spring({ frame: frame - 6, fps, config: { damping: 9, stiffness: 320, mass: 0.35 } });
  const hookOpacity = interpolate(frame - 6, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Gold medal pulse
  const glowPulse = interpolate(Math.sin((frame / 10) * Math.PI), [-1, 1], [0.70, 1.0]);

  // Stat badge — o3 score
  const statProgress = spring({ frame: frame - 18, fps, config: { damping: 11, stiffness: 290, mass: 0.38 } });
  const statOpacity = interpolate(frame - 18, [0, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 56px",
    }}>
      {/* Gold medal badge */}
      <div style={{
        transform: `translateY(${badgeY}px)`,
        opacity: badgeOpacity,
        backgroundColor: "rgba(245,158,11,0.12)",
        borderRadius: 100,
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: 14,
        paddingBottom: 14,
        marginBottom: 28,
        border: `2px solid ${COLORS.gold}`,
        filter: `drop-shadow(0 0 ${20 * glowPulse}px rgba(245,158,11,0.60))`,
      }}>
        <span style={{
          color: COLORS.goldBright,
          fontSize: 32,
          fontWeight: 800,
          letterSpacing: 4,
          fontFamily: "sans-serif",
        }}>{HOOK_BADGE_TEXT}</span>
      </div>

      {/* Main hook text */}
      <div style={{ transform: `scale(${hookScale})`, opacity: hookOpacity, textAlign: "center" }}>
        {HOOK_TEXT.split("\n").map((line, i) => (
          <div key={i} style={{
            color: i === 2 ? COLORS.goldBright : i === 1 ? COLORS.cyanBright : COLORS.textPrimary,
            fontSize: i === 1 ? 88 : 74,
            fontWeight: 900,
            lineHeight: 1.08,
            fontFamily: "sans-serif",
            textShadow: i === 2
              ? `0 0 40px rgba(252,211,77,0.65), 0 4px 16px rgba(0,0,0,0.85)`
              : i === 1
              ? `0 0 40px rgba(34,211,238,0.60), 0 4px 16px rgba(0,0,0,0.85)`
              : "0 4px 24px rgba(0,0,0,0.85)",
            letterSpacing: -1,
          }}>{line}</div>
        ))}
      </div>

      {/* OpenAI o3 stat */}
      <div style={{
        transform: `scale(${statProgress})`,
        opacity: statOpacity,
        marginTop: 28,
        backgroundColor: "rgba(14,165,233,0.10)",
        borderRadius: 14,
        paddingLeft: 26,
        paddingRight: 26,
        paddingTop: 13,
        paddingBottom: 13,
        border: `1px solid rgba(14,165,233,0.38)`,
      }}>
        <span style={{
          color: COLORS.cyanBright,
          fontSize: 32,
          fontWeight: 800,
          fontFamily: "sans-serif",
          letterSpacing: 1,
          textShadow: `0 0 14px rgba(34,211,238,0.45)`,
        }}>OpenAI o3 · IMO 2024</span>
      </div>
    </AbsoluteFill>
  );
};
