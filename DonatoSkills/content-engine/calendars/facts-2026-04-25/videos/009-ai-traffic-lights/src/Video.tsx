import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TechBackground } from "./components/TechBackground";
import { HookBadge } from "./components/HookBadge";
import { FullCaption, buildWordTimings } from "./components/FullCaption";
import { CTAOverlay } from "./components/CTAOverlay";
import { COLORS, BUFFER_FRAMES } from "./lib/constants";

interface SceneProps {
  durationInFrames: number;
  script: string;
  audioKey: string;
  showHook?: boolean;
  showCTA?: boolean;
}

const BaseScene: React.FC<SceneProps> = ({ durationInFrames, script, audioKey, showHook, showCTA }) => {
  const frame = useCurrentFrame();
  const wordTimings = buildWordTimings(script, 3, Math.max(10, durationInFrames - 12));

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: COLORS.background }}>
      <TechBackground durationInFrames={durationInFrames} accentColor={COLORS.green} accentRgb="16,185,129" />
      <Audio src={staticFile(audioKey)} />
      {showHook && <HookBadge />}
      {!showCTA && !showHook && <FullCaption words={wordTimings} />}
      {showCTA && <CTAOverlay />}
    </AbsoluteFill>
  );
};

export interface AiTrafficLightsVideoProps {
  s1Frames: number;
  s2Frames: number;
  s3Frames: number;
  s4Frames: number;
}

export const AiTrafficLightsVideo: React.FC<AiTrafficLightsVideoProps> = ({ s1Frames, s2Frames, s3Frames, s4Frames }) => {
  const s1Start = 0;
  const s2Start = s1Start + s1Frames + BUFFER_FRAMES;
  const s3Start = s2Start + s2Frames + BUFFER_FRAMES;
  const s4Start = s3Start + s3Frames + BUFFER_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Scene 1: Hook — "AI BEAT THE RED LIGHT WAIT" */}
      <Sequence from={s1Start} durationInFrames={s1Frames + BUFFER_FRAMES}>
        <BaseScene
          durationInFrames={s1Frames}
          audioKey="audio/scene-1.wav"
          script="An AI just slashed city commute times by twenty-six percent."
          showHook={true}
        />
      </Sequence>

      {/* Scene 2: Body — Surtrac, Pittsburgh, the numbers */}
      <Sequence from={s2Start} durationInFrames={s2Frames + BUFFER_FRAMES}>
        <BaseScene
          durationInFrames={s2Frames}
          audioKey="audio/scene-2.wav"
          script="Carnegie Mellon's Surtrac AI manages fifty-four intersections in Pittsburgh. Instead of fixed timing patterns it reads live traffic every second and coordinates signals city-wide. Result: twenty-six percent less travel time, forty percent fewer red light stops, and twenty-one percent lower vehicle emissions."
        />
      </Sequence>

      {/* Scene 3: Resolution — a century of traffic lights, changed */}
      <Sequence from={s3Start} durationInFrames={s3Frames + BUFFER_FRAMES}>
        <BaseScene
          durationInFrames={s3Frames}
          audioKey="audio/scene-3.wav"
          script="Traffic lights have worked the same way for a century. That just changed."
        />
      </Sequence>

      {/* Scene 4: CTA */}
      <Sequence from={s4Start} durationInFrames={s4Frames}>
        <BaseScene
          durationInFrames={s4Frames}
          audioKey="audio/scene-4.wav"
          script="Did you know?"
          showCTA={true}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
