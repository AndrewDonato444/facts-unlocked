import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { ScenePlayer } from "./components/ScenePlayer";
import { ChapterTitle } from "./components/ChapterTitle";
import type { CompositionPlan, SceneSequence, ChapterTitleSequence } from "./load-composition";

export const LongFormVideo: React.FC<{ composition: CompositionPlan }> = ({
  composition,
}) => {
  const frame = useCurrentFrame();
  const { sequences } = composition;

  // Build a flat timeline: each item gets a start frame.
  // Transitions overlap — they don't add time, they subtract it.
  // When a transition appears between two items, the next item starts
  // `transitionDuration` frames before the previous item ends.
  const timeline: Array<{
    item: (typeof sequences)[number];
    startFrame: number;
  }> = [];

  let cursor = 0;
  for (let i = 0; i < sequences.length; i++) {
    const seq = sequences[i];

    if (seq.type === "transition") {
      // Transition: the NEXT item overlaps by this duration
      // Don't add the transition itself to timeline — we handle crossfade
      // by rendering overlapping scenes with opacity
      cursor -= seq.durationInFrames;
      continue;
    }

    timeline.push({ item: seq, startFrame: cursor });
    cursor += seq.durationInFrames;
  }

  // Find which items are currently visible for crossfade
  // We need to render overlapping items with opacity blending
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a" }}>
      {timeline.map((entry, idx) => {
        const { item, startFrame } = entry;
        const endFrame = startFrame + item.durationInFrames;

        // Check if there's a crossfade transition before this item
        const prevEntry = idx > 0 ? timeline[idx - 1] : null;
        const prevEnd = prevEntry
          ? prevEntry.startFrame + prevEntry.item.durationInFrames
          : 0;
        const overlapFrames = prevEntry ? Math.max(0, prevEnd - startFrame) : 0;

        // During overlap, fade this item in
        let opacity = 1;
        if (overlapFrames > 0 && frame >= startFrame && frame < startFrame + overlapFrames) {
          opacity = interpolate(
            frame,
            [startFrame, startFrame + overlapFrames],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
        }

        // Fade out the previous item during overlap (handled by clamping its own opacity)
        // For the outgoing item, fade out in the last `overlapFrames`
        const nextEntry = idx < timeline.length - 1 ? timeline[idx + 1] : null;
        const nextStart = nextEntry ? nextEntry.startFrame : endFrame;
        const outOverlap = Math.max(0, endFrame - nextStart);
        if (outOverlap > 0 && frame >= endFrame - outOverlap && frame < endFrame) {
          opacity = interpolate(
            frame,
            [endFrame - outOverlap, endFrame],
            [1, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
        }

        return (
          <Sequence
            key={`${item.type}-${idx}`}
            from={startFrame}
            durationInFrames={item.durationInFrames}
          >
            <AbsoluteFill style={{ opacity }}>
              {item.type === "scene" && (
                <ScenePlayer scene={item as SceneSequence} />
              )}
              {item.type === "chapter_title" && (
                <ChapterTitle title={item as ChapterTitleSequence} />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
