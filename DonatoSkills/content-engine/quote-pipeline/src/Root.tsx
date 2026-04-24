import React from "react";
import { Composition } from "remotion";
import { QuoteCard } from "./QuoteCard";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

/**
 * Dynamic duration based on quote length:
 *   < 12 words  → 7 seconds (210 frames)
 *   12-20 words → 9 seconds (270 frames)
 *   > 20 words  → 11 seconds (330 frames)
 *
 * Reading speed ≈ 4 words/sec. Allocation:
 *   - 1s settle-in (background visible, text 40% opacity)
 *   - (words/4)s read window
 *   - 1s hold after attribution appears
 *   - 1s fade-out
 */
export function calculateDuration(quoteText: string): number {
  const words = quoteText.trim().split(/\s+/).length;
  if (words < 12) return 7 * FPS;
  if (words <= 20) return 9 * FPS;
  return 11 * FPS;
}

export const RemotionRoot: React.FC = () => {
  const defaultQuote = "A mother's love is the heart of the home.";
  return (
    <Composition
      id="QuoteCard"
      component={QuoteCard}
      durationInFrames={calculateDuration(defaultQuote)}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={{
        quoteText: defaultQuote,
        attribution: "Unknown",
        backgroundFile: "background.png",
        audioFile: "audio.mp3",
      }}
      calculateMetadata={({ props }) => ({
        durationInFrames: calculateDuration(props.quoteText),
      })}
    />
  );
};
