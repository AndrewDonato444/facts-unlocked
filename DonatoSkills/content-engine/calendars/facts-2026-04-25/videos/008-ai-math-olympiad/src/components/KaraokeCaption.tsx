import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../lib/constants";

interface WordTiming { word: string; startFrame: number; endFrame: number; }
interface KaraokeCaptionProps { words: WordTiming[]; }

export function buildWordTimings(script: string, windowStart: number, windowEnd: number): WordTiming[] {
  const wordList = script.trim().split(/\s+/);
  const totalFrames = windowEnd - windowStart;
  const framesPerWord = totalFrames / wordList.length;
  return wordList.map((word, i) => ({
    word,
    startFrame: windowStart + Math.round(i * framesPerWord),
    endFrame: windowStart + Math.round((i + 1) * framesPerWord),
  }));
}

const KaraokeWord: React.FC<{ word: string; startFrame: number; endFrame: number; isActive: boolean; isPast: boolean; }> = ({ word, startFrame, endFrame, isActive, isPast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Faster pop for fast-pace video
  const popScale = spring({ frame: frame - startFrame, fps, config: { damping: 10, stiffness: 400, mass: 0.25 } });
  const baseColor = isPast ? "rgba(240,249,255,0.35)" : isActive ? COLORS.goldBright : "rgba(240,249,255,0.82)";
  const glowIntensity = isActive ? interpolate(Math.sin((frame / 7) * Math.PI), [-1, 1], [5, 22]) : 0;
  void endFrame;
  return (
    <span style={{
      display: "inline-block",
      color: baseColor,
      transform: isActive ? `scale(${0.94 + popScale * 0.10})` : "scale(1)",
      filter: isActive ? `drop-shadow(0 0 ${glowIntensity}px ${COLORS.gold})` : "none",
      marginRight: 10,
      marginBottom: 4,
      fontWeight: isActive ? 900 : 700,
      textShadow: isActive
        ? `0 0 18px rgba(245,158,11,0.70), 0 2px 8px rgba(0,0,0,0.92)`
        : "0 2px 8px rgba(0,0,0,0.82)",
    }}>
      {word}
    </span>
  );
};

export const KaraokeCaption: React.FC<KaraokeCaptionProps> = ({ words }) => {
  const frame = useCurrentFrame();
  const activeIdx = words.findIndex((w) => frame >= w.startFrame && frame < w.endFrame);
  if (activeIdx === -1 && !words.some((w) => frame >= w.startFrame)) return null;
  if (activeIdx === -1 && words.every((w) => frame >= w.endFrame)) return null;
  const windowStart = Math.max(0, activeIdx === -1 ? 0 : activeIdx - 3);
  const windowEnd = Math.min(words.length, windowStart + 7);
  const visibleWords = words.slice(windowStart, windowEnd);
  const firstVisible = visibleWords[0];
  const lastVisible = visibleWords[visibleWords.length - 1];
  const fadeIn = interpolate(frame - firstVisible.startFrame, [0, 4], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [lastVisible.endFrame - 6, lastVisible.endFrame], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ position: "absolute", bottom: 220, left: 0, right: 0, padding: "0 52px", opacity: Math.min(fadeIn, fadeOut) }}>
      <div style={{
        backgroundColor: COLORS.captionBg,
        borderRadius: 18,
        padding: "18px 24px",
        border: `1px solid rgba(245,158,11,0.25)`,
        backdropFilter: "blur(8px)",
      }}>
        <div style={{
          fontSize: 46,
          fontFamily: "sans-serif",
          lineHeight: 1.4,
          textAlign: "center",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
        }}>
          {visibleWords.map((w, i) => {
            const globalIdx = windowStart + i;
            const isActive = activeIdx === globalIdx;
            const isPast = frame >= w.endFrame;
            return <KaraokeWord key={`${w.startFrame}-${i}`} word={w.word} startFrame={w.startFrame} endFrame={w.endFrame} isActive={isActive} isPast={isPast} />;
          })}
        </div>
      </div>
    </div>
  );
};
