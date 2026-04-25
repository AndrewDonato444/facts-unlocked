import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { TechBackground } from "./components/TechBackground";
import { HookBadge } from "./components/HookBadge";
import { FullCaption, buildWordTimings } from "./components/FullCaption";
import { CTAOverlay } from "./components/CTAOverlay";
import { COLORS, BUFFER_FRAMES } from "./lib/constants";

interface SceneProps {
  durationInFrames: number;
  sceneNum: number;
  script: string;
  audioKey: string;
  showHook?: boolean;
  showCTA?: boolean;
}

const BaseScene: React.FC<SceneProps> = ({ durationInFrames, sceneNum, script, audioKey, showHook, showCTA }) => {
  const frame = useCurrentFrame();
  void sceneNum;
  const wordTimings = buildWordTimings(script, 3, Math.max(10, durationInFrames - 12));

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );

  return (
    <AbsoluteFill style={{ opacity: exitOpacity, backgroundColor: COLORS.background }}>
      <TechBackground durationInFrames={durationInFrames} accentColor={COLORS.blue} accentRgb="14,165,233" />
      <Audio src={staticFile(audioKey)} />
      {showHook && <HookBadge />}
      {!showCTA && !showHook && <FullCaption words={wordTimings} />}
      {showCTA && <CTAOverlay />}
    </AbsoluteFill>
  );
};

export interface AiRadiationTherapyVideoProps {
  s1Frames: number;
  s2Frames: number;
  s3Frames: number;
  s4Frames: number;
}

export const AiRadiationTherapyVideo: React.FC<AiRadiationTherapyVideoProps> = ({ s1Frames, s2Frames, s3Frames, s4Frames }) => {
  const s1Start = 0;
  const s2Start = s1Start + s1Frames + BUFFER_FRAMES;
  const s3Start = s2Start + s2Frames + BUFFER_FRAMES;
  const s4Start = s3Start + s3Frames + BUFFER_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Scene 1: Hook — "AI MATCHES RADIATION EXPERTS IN MINUTES" */}
      <Sequence from={s1Start} durationInFrames={s1Frames + BUFFER_FRAMES}>
        <BaseScene
          durationInFrames={s1Frames}
          sceneNum={1}
          audioKey="audio/scene-1.wav"
          script="AI now designs radiation therapy plans in minutes."
          showHook={true}
        />
      </Sequence>

      {/* Scene 2: Body — oncologist time comparison, Elekta precision */}
      <Sequence from={s2Start} durationInFrames={s2Frames + BUFFER_FRAMES}>
        <BaseScene
          durationInFrames={s2Frames}
          sceneNum={2}
          audioKey="audio/scene-2.wav"
          script="For decades, oncologists spent days manually plotting treatment fields around tumors. Systems like Elekta's AI achieve ninety-nine point eight percent precision matching expert radiologists — and can process ten times more patients in the same window."
        />
      </Sequence>

      {/* Scene 3: Resolution — bottleneck solved */}
      <Sequence from={s3Start} durationInFrames={s3Frames + BUFFER_FRAMES}>
        <BaseScene
          durationInFrames={s3Frames}
          sceneNum={3}
          audioKey="audio/scene-3.wav"
          script="The bottleneck was human capacity. Now it's not."
        />
      </Sequence>

      {/* Scene 4: CTA */}
      <Sequence from={s4Start} durationInFrames={s4Frames}>
        <BaseScene
          durationInFrames={s4Frames}
          sceneNum={4}
          audioKey="audio/scene-4.wav"
          script="Did you know?"
          showCTA={true}
        />
      </Sequence>
    </AbsoluteFill>
  );
};
