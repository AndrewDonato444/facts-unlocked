import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./Video";
import manifest from "../public/audio/manifest.json";

const fps = 30;

const scene1Frames = Math.ceil(manifest["scene-1-hook"].durationSec * fps);
const scene2Frames = Math.ceil(manifest["scene-2-body"].durationSec * fps);
const scene3Frames = Math.ceil(manifest["scene-3-cta"].durationSec * fps);
const totalFrames = scene1Frames + scene2Frames + scene3Frames;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VibeCoding"
      component={MainVideo}
      durationInFrames={totalFrames}
      fps={fps}
      width={1080}
      height={1080}
      defaultProps={{
        scene1Frames,
        scene2Frames,
        scene3Frames,
      }}
    />
  );
};
