import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";

interface AnimatedTextProps {
  text: string;
  startFrame: number;
  fontSize?: number;
  color?: string;
  fontWeight?: string | number;
  textAlign?: "left" | "center" | "right";
  highlight?: boolean;
  highlightColor?: string;
  delay?: number;
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  startFrame,
  fontSize = 56,
  color = "#ffffff",
  fontWeight = "800",
  textAlign = "center",
  highlight = false,
  highlightColor = "rgba(199,125,255,0.25)",
  delay = 0,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame - delay);

  const opacity = interpolate(localFrame, [0, 8], [0, 1], { extrapolateRight: "clamp" });
  const translateY = interpolate(localFrame, [0, 12], [28, 0], { extrapolateRight: "clamp" });
  const scale = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 120, mass: 0.8 } });
  const scaleVal = interpolate(scale, [0, 1], [0.92, 1]);

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px) scale(${scaleVal})`,
        textAlign,
        color,
        fontSize,
        fontWeight,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        lineHeight: 1.2,
        letterSpacing: "-0.02em",
        background: highlight ? highlightColor : "transparent",
        borderRadius: highlight ? 12 : 0,
        padding: highlight ? "8px 20px" : 0,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// Word-by-word reveal for karaoke highlight
interface KaraokeTextProps {
  words: string[];
  startFrame: number;
  framesPerWord?: number;
  fontSize?: number;
  highlightColor?: string;
  color?: string;
  textAlign?: "left" | "center" | "right";
}

export const KaraokeText: React.FC<KaraokeTextProps> = ({
  words,
  startFrame,
  framesPerWord = 8,
  fontSize = 52,
  highlightColor = "#c77dff",
  color = "rgba(255,255,255,0.6)",
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();
  const localFrame = Math.max(0, frame - startFrame);
  const activeWord = Math.floor(localFrame / framesPerWord);

  return (
    <div style={{ textAlign, fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif", lineHeight: 1.4 }}>
      {words.map((word, i) => {
        const isActive = i <= activeWord;
        const isCurrent = i === activeWord;
        return (
          <span
            key={i}
            style={{
              fontSize,
              fontWeight: "800",
              color: isCurrent ? highlightColor : isActive ? "#ffffff" : color,
              textShadow: isCurrent ? `0 0 20px ${highlightColor}88` : "none",
              marginRight: "0.25em",
              transition: "color 0.1s",
              display: "inline-block",
              letterSpacing: "-0.01em",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
