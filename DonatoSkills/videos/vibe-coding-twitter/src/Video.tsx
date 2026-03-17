import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Scene1Hook } from "./components/Scene1Hook";
import { Scene2Body } from "./components/Scene2Body";
import { Scene3CTA } from "./components/Scene3CTA";
import { COLORS } from "./lib/constants";

export const MainVideo: React.FC<{
  scene1Frames: number;
  scene2Frames: number;
  scene3Frames: number;
}> = ({ scene1Frames, scene2Frames, scene3Frames }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLORS.background }}>
      {/* Scene 1: Hook */}
      <Sequence from={0} durationInFrames={scene1Frames}>
        <Audio src={staticFile("audio/scene-1-hook.wav")} />
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: Body */}
      <Sequence from={scene1Frames} durationInFrames={scene2Frames}>
        <Audio src={staticFile("audio/scene-2-body.wav")} />
        <Scene2Body />
      </Sequence>

      {/* Scene 3: CTA */}
      <Sequence from={scene1Frames + scene2Frames} durationInFrames={scene3Frames}>
        <Audio src={staticFile("audio/scene-3-cta.wav")} />
        <Scene3CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
