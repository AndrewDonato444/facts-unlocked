import React from "react";
import { Composition } from "remotion";
import { BabyFontanelleVideo } from "./Video";
import manifestData from "../public/audio/manifest.json";

const fps = 30;
const BUFFER = Math.ceil(0.25 * fps);

const hookDur = Math.ceil(manifestData["scene-1-hook"].durationSec * fps) + BUFFER;
const bodyDur = Math.ceil(manifestData["scene-2-body"].durationSec * fps) + BUFFER;
const ctaDur = Math.ceil(manifestData["scene-3-cta"].durationSec * fps) + BUFFER;
const totalFrames = hookDur + bodyDur + ctaDur;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="BabyFontanellePulse"
      component={BabyFontanelleVideo}
      durationInFrames={totalFrames}
      fps={fps}
      width={1080}
      height={1920}
    />
  );
};
