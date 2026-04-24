import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface QuoteCardProps {
  quoteText: string;
  attribution: string;
  backgroundFile: string; // filename only (e.g. "background.png") — resolved via staticFile()
  audioFile: string;      // filename only (e.g. "audio.mp3")
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quoteText,
  attribution,
  backgroundFile,
  audioFile,
}) => {
  const backgroundSrc = staticFile(backgroundFile);
  const audioSrc = staticFile(audioFile);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Background: FULL OPACITY from frame 0 (no fade-in — first-frame must be
  // thumbnail-ready because TikTok/IG use it as the feed cover by default).
  // Subtle slow zoom across the whole duration for visual interest.
  const bgScale = interpolate(frame, [0, durationInFrames], [1.0, 1.06], {
    extrapolateRight: "clamp",
  });

  // Quote text: visible at 70% from frame 0 (thumbnail-ready — TikTok/IG use
  // frame 0 as the feed cover), animates to 100% by frame 15 (0.5s in).
  // Gentle spring scale for polish.
  const quoteSpring = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 100, mass: 0.7 },
  });
  const quoteScale = interpolate(quoteSpring, [0, 1], [0.97, 1.0]);
  const quoteOpacity = Math.min(
    interpolate(frame, [0, 15], [0.7, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
    })
  );

  // Attribution: also visible at 40% from frame 0 so the full quote composition
  // reads on the thumbnail, animates to 100% by frame 30.
  const attrOpacity = Math.min(
    interpolate(frame, [0, 30], [0.4, 1], { extrapolateRight: "clamp" }),
    interpolate(frame, [durationInFrames - 20, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
    })
  );

  // Audio: fade-out in the final 1.5s (45 frames)
  const audioVolume = (f: number) => {
    if (f > durationInFrames - 45) {
      return Math.max(0, 1 - (f - (durationInFrames - 45)) / 45) * 0.6;
    }
    return 0.6;
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a2e" }}>
      {/* Background image — whimsical illustration, full opacity from frame 0 */}
      <AbsoluteFill
        style={{
          transform: `scale(${bgScale})`,
        }}
      >
        <Img
          src={backgroundSrc}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>

      {/* Soft vignette overlay for text readability — also full opacity */}
      <AbsoluteFill
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.05) 35%, rgba(0,0,0,0.05) 65%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Quote text block */}
      <AbsoluteFill
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "120px 90px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "50px",
            transform: `scale(${quoteScale})`,
            maxWidth: "900px",
            textAlign: "center",
          }}
        >
          <QuoteText text={quoteText} opacity={quoteOpacity} />
          <Attribution text={attribution} opacity={attrOpacity} />
        </div>
      </AbsoluteFill>

      {/* Audio: soft ambient track with fade-out */}
      <Audio src={audioSrc} volume={audioVolume} />
    </AbsoluteFill>
  );
};

const QuoteText: React.FC<{ text: string; opacity: number }> = ({
  text,
  opacity,
}) => {
  // Scale font size based on length — longer quotes need smaller text
  const length = text.length;
  const fontSize = length > 140 ? 58 : length > 90 ? 68 : length > 50 ? 82 : 96;

  return (
    <div
      style={{
        fontFamily:
          '"Georgia", "Playfair Display", "Iowan Old Style", "Palatino", serif',
        fontSize,
        fontWeight: 600,
        color: "#ffffff",
        lineHeight: 1.25,
        letterSpacing: "-0.01em",
        textShadow:
          "0 4px 24px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.8)",
        opacity,
      }}
    >
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontSize: fontSize * 1.4,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 0.5,
          verticalAlign: "top",
          marginRight: 8,
        }}
      >
        "
      </span>
      {text}
      <span
        style={{
          fontFamily: "Georgia, serif",
          fontSize: fontSize * 1.4,
          color: "rgba(255,255,255,0.85)",
          lineHeight: 0.5,
          verticalAlign: "top",
          marginLeft: 4,
        }}
      >
        "
      </span>
    </div>
  );
};

const Attribution: React.FC<{ text: string; opacity: number }> = ({
  text,
  opacity,
}) => (
  <div
    style={{
      fontFamily:
        '"Helvetica Neue", "Inter", "Segoe UI", system-ui, sans-serif',
      fontSize: 34,
      fontWeight: 400,
      color: "rgba(255,255,255,0.88)",
      letterSpacing: "0.14em",
      textTransform: "uppercase" as const,
      textShadow: "0 2px 12px rgba(0,0,0,0.6)",
      opacity,
    }}
  >
    — {text}
  </div>
);
